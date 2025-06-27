import { describe, it, expect } from 'vitest';
import { PersonaTransformer, AIPersonaTransformerError, PRESET_PERSONAS } from '../../src/lib/ai-persona-transformer';
import type { Env } from '../../src/types/env';

describe('PersonaTransformer Static Methods', () => {
  describe('getPresetPersonas', () => {
    it('should return all preset personas with correct structure', () => {
      const personas = PersonaTransformer.getPresetPersonas();

      expect(personas).toHaveLength(4);
      
      const expectedPersonas = [
        { key: 'internet-random', name: 'Internet Random' },
        { key: 'barely-literate', name: 'Barely Literate' },
        { key: 'extremely-serious', name: 'Extremely Serious' },
        { key: 'super-nice', name: 'Super Nice' }
      ];

      expectedPersonas.forEach(expected => {
        const persona = personas.find(p => p.key === expected.key);
        expect(persona).toBeDefined();
        expect(persona?.name).toBe(expected.name);
        expect(persona?.description).toBeDefined();
        expect(typeof persona?.description).toBe('string');
      });
    });

    it('should include all required fields for each persona', () => {
      const personas = PersonaTransformer.getPresetPersonas();

      personas.forEach(persona => {
        expect(persona).toHaveProperty('key');
        expect(persona).toHaveProperty('name');
        expect(persona).toHaveProperty('description');
        expect(typeof persona.key).toBe('string');
        expect(typeof persona.name).toBe('string');
        expect(typeof persona.description).toBe('string');
        expect(persona.key.length).toBeGreaterThan(0);
        expect(persona.name.length).toBeGreaterThan(0);
        expect(persona.description.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('PRESET_PERSONAS', () => {
  it('should have all required personas', () => {
    const requiredPersonas = ['internet-random', 'barely-literate', 'extremely-serious', 'super-nice'];
    
    requiredPersonas.forEach(persona => {
      expect(PRESET_PERSONAS).toHaveProperty(persona);
    });
  });

  it('should have valid configuration for each persona', () => {
    Object.entries(PRESET_PERSONAS).forEach(([key, config]) => {
      expect(config).toHaveProperty('systemPrompt');
      expect(config).toHaveProperty('examples');
      expect(config).toHaveProperty('temperature');
      
      expect(typeof config.systemPrompt).toBe('string');
      expect(config.systemPrompt.length).toBeGreaterThan(0);
      expect(Array.isArray(config.examples)).toBe(true);
      expect(config.examples.length).toBeGreaterThan(0);
      expect(typeof config.temperature).toBe('number');
      expect(config.temperature).toBeGreaterThanOrEqual(0);
      expect(config.temperature).toBeLessThanOrEqual(1);

      // Check example structure
      config.examples.forEach(example => {
        expect(example).toHaveProperty('input');
        expect(example).toHaveProperty('output');
        expect(typeof example.input).toBe('string');
        expect(typeof example.output).toBe('string');
        expect(example.input.length).toBeGreaterThan(0);
        expect(example.output.length).toBeGreaterThan(0);
      });
    });
  });

  it('should have reasonable temperature values', () => {
    Object.entries(PRESET_PERSONAS).forEach(([key, config]) => {
      // Internet random should be more creative (higher temperature)
      if (key === 'internet-random') {
        expect(config.temperature).toBeGreaterThan(0.5);
      }
      // Extremely serious should be more deterministic (lower temperature)
      if (key === 'extremely-serious') {
        expect(config.temperature).toBeLessThan(0.5);
      }
    });
  });
});

describe('AIPersonaTransformerError', () => {
  it('should create error with correct properties', () => {
    const cause = new Error('Original error');
    const error = new AIPersonaTransformerError('Test error', cause);

    expect(error.name).toBe('AIPersonaTransformerError');
    expect(error.message).toBe('Test error');
    expect(error.cause).toBe(cause);
  });

  it('should create error without cause', () => {
    const error = new AIPersonaTransformerError('Test error');

    expect(error.name).toBe('AIPersonaTransformerError');
    expect(error.message).toBe('Test error');
    expect(error.cause).toBeUndefined();
  });
});

// Note: PersonaTransformer constructor tests are skipped because Anthropic SDK
// doesn't work well in test environments without proper mocking setup