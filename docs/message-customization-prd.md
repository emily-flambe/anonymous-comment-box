# PRD: Message Customization & Preview Feature

## Executive Summary

This PRD outlines the development of a message customization and preview system for the anonymous comment box application. The feature enables users to apply AI-powered persona transformations to their messages and preview the results before submission, with robust rate limiting to prevent abuse.

### Key Features
- **AI Persona Selection**: Preset and custom persona options for message transformation
- **Message Preview**: Real-time preview of transformed messages
- **Rate Limiting**: 10 requests per minute (shared between preview and submission)
- **User Experience**: Seamless integration with existing submission flow

## Product Goals

### Primary Objectives
1. Enable users to customize their message tone and style
2. Provide transparency through message preview functionality
3. Maintain system performance and prevent abuse through rate limiting
4. Preserve user anonymity while adding personalization options

### Success Criteria
- 80% of users engage with persona selection feature
- Preview functionality used by 60% of users before submission
- Rate limiting prevents >95% of potential abuse
- No degradation in submission success rates

## User Stories & Acceptance Criteria

### Epic 1: AI Persona Selection

#### Story 1.1: Preset Persona Selection
**As a** user submitting an anonymous message  
**I want to** select from predefined AI personas to transform my message  
**So that** I can express my thoughts in different styles while maintaining anonymity

**Acceptance Criteria:**
- [ ] Display persona selector with at least 4 preset options:
  - "Internet Random" (casual, meme-friendly, typos/abbreviations)
  - "Barely Literate" (poor grammar, simple vocabulary, informal)
  - "Extremely Serious" (formal, academic, professional tone)
  - "Super Nice" (overly polite, encouraging, positive)
- [ ] Persona selection persists during session
- [ ] Clear descriptions for each persona option
- [ ] Default to "No transformation" option

#### Story 1.2: Custom Persona Input
**As a** user wanting specific message styling  
**I want to** define a custom persona description  
**So that** I can achieve precise message transformation

**Acceptance Criteria:**
- [ ] Free-text input field for custom persona description
- [ ] 500 character limit for custom persona input
- [ ] Real-time character counter
- [ ] Input validation and sanitization
- [ ] Custom persona overrides preset selection

### Epic 2: Message Preview System

#### Story 2.1: Preview Generation
**As a** user crafting a message  
**I want to** preview how my message will appear after persona transformation  
**So that** I can verify the result before submission

**Acceptance Criteria:**
- [ ] "Preview" button adjacent to message input
- [ ] Preview displays transformed message in read-only format
- [ ] Clear visual distinction between original and transformed text
- [ ] Loading state during API processing
- [ ] Error handling for failed transformations

#### Story 2.2: Preview Rate Limiting
**As a** system administrator  
**I want to** limit preview requests to prevent abuse  
**So that** the system remains performant for all users

**Acceptance Criteria:**
- [ ] 10 requests per minute rate limit (shared with submissions)
- [ ] Rate limit counter displayed to user
- [ ] Warning at 8/10 requests consumed
- [ ] Graceful error message when limit exceeded
- [ ] Rate limit resets every minute

## Technical Requirements

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│  Rate Limiter   │───▶│  AI Transform   │
│                 │    │   (Redis)       │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   State Mgmt    │    │  Usage Analytics│    │   Response      │
│   (Session)     │    │    (Metrics)    │    │   Handler       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### API Design

#### New Endpoints

##### POST /api/preview
Transform message with selected persona for preview

**Request:**
```typescript
interface PreviewRequest {
  message: string;           // Original message (max 2000 chars)
  persona?: string;          // Preset persona key
  customPersona?: string;    // Custom persona description (max 500 chars)
  sessionId: string;         // For rate limiting
}
```

**Response:**
```typescript
interface PreviewResponse {
  transformedMessage: string;
  originalMessage: string;
  persona: string;
  rateLimitRemaining: number;
  rateLimitReset: number;    // Unix timestamp
}
```

**Error Responses:**
- `429 Too Many Requests` - Rate limit exceeded
- `400 Bad Request` - Invalid input parameters
- `500 Internal Server Error` - AI transformation failed

##### GET /api/rate-limit-status
Check current rate limit status

**Response:**
```typescript
interface RateLimitStatus {
  remaining: number;
  reset: number;            // Unix timestamp
  limit: number;
}
```

#### Modified Endpoints

##### POST /api/submit (Enhanced)
Extended to support persona transformation

**Request (Modified):**
```typescript
interface SubmitRequest {
  message: string;
  persona?: string;          // NEW: Preset persona key
  customPersona?: string;    // NEW: Custom persona description
  sessionId: string;
}
```

### Frontend Implementation

#### Component Architecture

```typescript
// PersonaSelector.tsx
interface PersonaOption {
  key: string;
  name: string;
  description: string;
  example: string;
}

interface PersonaSelectorProps {
  selectedPersona: string;
  customPersona: string;
  onPersonaChange: (persona: string) => void;
  onCustomPersonaChange: (custom: string) => void;
}

// MessagePreview.tsx
interface MessagePreviewProps {
  originalMessage: string;
  transformedMessage: string;
  isLoading: boolean;
  onPreview: () => void;
  rateLimitStatus: RateLimitStatus;
}

// Enhanced MessageForm.tsx
interface MessageFormState {
  message: string;
  selectedPersona: string;
  customPersona: string;
  previewData: PreviewResponse | null;
  rateLimitStatus: RateLimitStatus;
  isPreviewLoading: boolean;
}
```

#### State Management

```typescript
// Session-based state for rate limiting
interface SessionState {
  sessionId: string;
  rateLimitStatus: RateLimitStatus;
  selectedPersona: string;
  customPersona: string;
}

// Rate limit state management
const useRateLimit = () => {
  const [status, setStatus] = useState<RateLimitStatus>();
  
  const checkStatus = async () => {
    const response = await fetch('/api/rate-limit-status');
    setStatus(await response.json());
  };
  
  const decrementRemaining = () => {
    if (status) {
      setStatus({
        ...status,
        remaining: Math.max(0, status.remaining - 1)
      });
    }
  };
  
  return { status, checkStatus, decrementRemaining };
};
```

### Backend Implementation

#### Rate Limiting Service

```typescript
// lib/rate-limiter.ts
interface RateLimitConfig {
  windowMs: number;      // 60000 (1 minute)
  maxRequests: number;   // 10
  keyGenerator: (req: Request) => string;
}

class RateLimiter {
  private redis: RedisClient;
  private config: RateLimitConfig;

  async checkLimit(key: string): Promise<RateLimitResult> {
    const current = await this.redis.get(`rate_limit:${key}`);
    const count = current ? parseInt(current) : 0;
    
    if (count >= this.config.maxRequests) {
      const ttl = await this.redis.ttl(`rate_limit:${key}`);
      throw new RateLimitError(count, ttl);
    }

    const newCount = await this.redis.incr(`rate_limit:${key}`);
    if (newCount === 1) {
      await this.redis.expire(`rate_limit:${key}`, this.config.windowMs / 1000);
    }

    const ttl = await this.redis.ttl(`rate_limit:${key}`);
    return {
      remaining: this.config.maxRequests - newCount,
      reset: Date.now() + (ttl * 1000)
    };
  }
}
```

#### AI Transformation Service

```typescript
// lib/ai-persona-transformer.ts
interface PersonaConfig {
  [key: string]: {
    systemPrompt: string;
    examples: Array<{input: string; output: string}>;
    temperature: number;
  };
}

const PRESET_PERSONAS: PersonaConfig = {
  'internet-random': {
    systemPrompt: 'Transform the message to sound like casual internet slang with abbreviations, mild typos, and meme references. Keep the core message intact.',
    temperature: 0.8,
    examples: [
      {
        input: 'I think this is a great idea and we should implement it.',
        output: 'ngl this idea slaps 💯 we should def implement this fr fr'
      }
    ]
  },
  'barely-literate': {
    systemPrompt: 'Rewrite with poor grammar, simple vocabulary, and informal structure while preserving the original meaning.',
    temperature: 0.7,
    examples: [
      {
        input: 'I disagree with this decision because it seems poorly thought out.',
        output: 'i dont like this thing cuz it dont make sense to me and stuff'
      }
    ]
  },
  'extremely-serious': {
    systemPrompt: 'Transform to formal, academic language with professional vocabulary and structure.',
    temperature: 0.3,
    examples: [
      {
        input: 'This is really bad and needs to be fixed.',
        output: 'This matter requires immediate attention and systematic remediation to address the identified deficiencies.'
      }
    ]
  },
  'super-nice': {
    systemPrompt: 'Rewrite with overly polite, encouraging, and positive language while maintaining the core message.',
    temperature: 0.6,
    examples: [
      {
        input: 'This feature is broken and frustrating.',
        output: 'I hope this feedback is helpful! The feature might benefit from some adjustments as it seems to present challenges for users. Thank you for considering improvements! 😊'
      }
    ]
  }
};

class PersonaTransformer {
  async transformMessage(
    message: string,
    persona: string,
    customPersona?: string
  ): Promise<string> {
    const systemPrompt = customPersona || 
                        PRESET_PERSONAS[persona]?.systemPrompt ||
                        'Return the message unchanged.';
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: PRESET_PERSONAS[persona]?.temperature || 0.7,
      max_tokens: 500
    });

    return response.choices[0]?.message?.content || message;
  }
}
```

### Data Models

#### Database Schema Extensions

```sql
-- Rate limiting (Redis-based, no DB changes needed)
-- Session management (In-memory/Redis)

-- Optional: Analytics table for persona usage
CREATE TABLE persona_analytics (
  id SERIAL PRIMARY KEY,
  persona_type VARCHAR(50) NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 1,
  date_used DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_persona_analytics_date ON persona_analytics(date_used);
CREATE INDEX idx_persona_analytics_type ON persona_analytics(persona_type);
```

### Security Considerations

#### Input Validation & Sanitization

```typescript
// Input validation schema
const previewRequestSchema = {
  message: {
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    sanitize: true
  },
  persona: {
    type: 'string',
    enum: ['internet-random', 'barely-literate', 'extremely-serious', 'super-nice'],
    optional: true
  },
  customPersona: {
    type: 'string',
    maxLength: 500,
    sanitize: true,
    optional: true
  }
};

// Rate limiting by IP + session
const rateLimitKey = (req: Request): string => {
  const ip = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For');
  const sessionId = req.headers.get('X-Session-ID');
  return `${ip}:${sessionId}`;
};
```

#### AI Safety Measures

```typescript
// Content filtering
const contentFilter = {
  checkForProblematicContent: (text: string): boolean => {
    // Implement content filtering logic
    // Check for harassment, hate speech, etc.
    return false; // Placeholder
  },
  
  sanitizeTransformation: (original: string, transformed: string): string => {
    // Ensure transformation doesn't add inappropriate content
    // If problematic, return original message
    return transformed;
  }
};
```

### Performance Requirements

#### Response Time Targets
- **Preview Generation**: < 3 seconds (95th percentile)
- **Rate Limit Check**: < 100ms
- **UI Interactions**: < 200ms

#### Scalability Considerations
- **Redis Clustering**: For rate limiting at scale
- **AI Service Pool**: Multiple transformation service instances
- **CDN Integration**: Static asset optimization
- **Connection Pooling**: Database and external service connections

#### Resource Usage
- **Memory**: 512MB baseline + 50MB per concurrent transformation
- **CPU**: Burst capability for AI processing spikes
- **Network**: 100KB average payload size

### Error Handling & Edge Cases

#### Error Scenarios
1. **AI Service Unavailable**: Fallback to original message
2. **Rate Limit Exceeded**: Clear user messaging with reset timer
3. **Invalid Input**: Detailed validation error responses
4. **Network Timeouts**: Retry logic with exponential backoff
5. **Session Expiry**: Graceful session regeneration

#### Fallback Strategies
```typescript
const transformWithFallback = async (message: string, persona: string) => {
  try {
    return await aiTransformer.transform(message, persona);
  } catch (error) {
    if (error instanceof AIServiceError) {
      // Log error for monitoring
      logger.error('AI transformation failed', { error, persona });
      // Return original message with user notification
      return {
        transformedMessage: message,
        fallbackUsed: true,
        error: 'Transformation temporarily unavailable'
      };
    }
    throw error;
  }
};
```

### Testing Strategy

#### Unit Tests
- Persona transformation logic
- Rate limiting functionality
- Input validation
- Error handling

#### Integration Tests
- API endpoint functionality
- Database interactions
- AI service integration
- Rate limiting coordination

#### End-to-End Tests
```typescript
// E2E test scenarios
describe('Message Customization Flow', () => {
  test('Complete persona selection and preview flow', async () => {
    // 1. Load message form
    // 2. Select persona
    // 3. Enter message
    // 4. Generate preview
    // 5. Verify transformation
    // 6. Submit message
  });

  test('Rate limiting enforcement', async () => {
    // 1. Make 10 preview requests
    // 2. Verify 11th request fails
    // 3. Wait for reset
    // 4. Verify functionality restored
  });

  test('Custom persona functionality', async () => {
    // 1. Enter custom persona description
    // 2. Generate preview
    // 3. Verify custom transformation applied
  });
});
```

#### Performance Tests
- Load testing with concurrent users
- Rate limiting stress tests
- AI service response time validation
- Memory usage monitoring

### Monitoring & Analytics

#### Key Metrics
```typescript
// Metrics collection
interface MetricsData {
  // Usage metrics
  previewGenerations: number;
  personaUsage: Record<string, number>;
  customPersonaUsage: number;
  
  // Performance metrics
  averageTransformTime: number;
  rateLimitHitRate: number;
  errorRate: number;
  
  // User behavior
  previewToSubmissionRatio: number;
  sessionDuration: number;
  featureAdoptionRate: number;
}
```

#### Dashboards
- Real-time usage statistics
- Performance monitoring
- Error rate tracking
- Rate limiting effectiveness
- User engagement metrics

### Deployment Plan

#### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Rate limiting service implementation
- [ ] AI transformation service setup
- [ ] API endpoint development
- [ ] Basic frontend components

#### Phase 2: Feature Integration (Week 3-4)
- [ ] Persona selection UI
- [ ] Preview functionality
- [ ] Error handling implementation
- [ ] Testing suite completion

#### Phase 3: Polish & Launch (Week 5-6)
- [ ] Performance optimization
- [ ] Security review
- [ ] Monitoring setup
- [ ] Production deployment

#### Rollback Strategy
- Feature flags for gradual rollout
- Database migration reversibility
- Quick disable capability
- Fallback to original submission flow

### Risk Assessment

#### High Risk
- **AI Service Dependency**: Mitigation via fallback strategies
- **Rate Limiting Bypass**: Robust session management required
- **Performance Impact**: Load testing and optimization critical

#### Medium Risk
- **User Adoption**: Clear UX and onboarding important
- **Content Quality**: AI output monitoring needed
- **Scaling Challenges**: Proper infrastructure planning required

#### Low Risk
- **Integration Complexity**: Well-defined interfaces
- **Maintenance Overhead**: Automated testing coverage

### Success Metrics & KPIs

#### Primary KPIs
- **Feature Adoption Rate**: % of users using persona selection
- **Preview Usage Rate**: % of users previewing before submission
- **Transformation Success Rate**: % of successful AI transformations
- **User Satisfaction**: Measured via optional feedback

#### Secondary KPIs
- **Performance Metrics**: Response times, error rates
- **System Health**: Rate limiting effectiveness, resource usage
- **Engagement Metrics**: Session duration, repeat usage

#### Measurement Timeline
- **Week 1**: Baseline metrics establishment
- **Week 4**: Initial feature impact assessment
- **Week 8**: Full success criteria evaluation
- **Monthly**: Ongoing performance and adoption tracking

---

**Document Version**: 1.0  
**Last Updated**: 2024-06-27  
**Next Review**: 2024-07-27  
**Stakeholders**: Product, Engineering, UX, QA teams