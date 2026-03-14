---

layout: default
title: "Claude Code Express TypeScript API Guide: Build Production-Ready APIs"
description: "A practical guide to building Express APIs with TypeScript using Claude Code. Learn project setup, routing, validation, error handling, and testing strategies."
date: 2026-03-14
categories: [guides]
tags: [express, typescript, api-development, claude-code, nodejs, backend]
author: theluckystrike
reviewed: true
score: 8
permalink: /claude-code-express-typescript-api-guide/
---

# Claude Code Express TypeScript API Guide: Build Production-Ready APIs

Building Express APIs with TypeScript provides type safety, better developer experience, and maintainable codebases. Claude Code accelerates this workflow by generating boilerplate, writing tests, and helping you implement best practices efficiently. This guide walks through creating a production-ready Express TypeScript API with Claude Code.

## Project Setup with Claude Code

Initialize your Express TypeScript project with proper tooling. Claude Code can scaffold the entire structure including package.json, TypeScript configuration, and directory structure.

```bash
npm init -y
npm install express cors helmet morgan
npm install -D typescript @types/node @types/express @types/cors @types/morgan ts-node nodemon
npx tsc --init
```

Configure your tsconfig.json for optimal development:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Create your main application file with proper structure:

```typescript
// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
};
```

## Building API Routes and Controllers

Organize your API using the controller pattern. Claude Code helps generate clean, separation-of-concerns architecture.

```typescript
// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

const users: User[] = [];

export const userController = {
  getAll: (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ data: users, count: users.length });
    } catch (error) {
      next(error);
    }
  },

  getById: (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = users.find(u => u.id === id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json({ data: user });
    } catch (error) {
      next(error);
    }
  },

  create: (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name } = req.body;
      
      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        email,
        name,
        createdAt: new Date()
      };

      users.push(newUser);
      res.status(201).json({ data: newUser });
    } catch (error) {
      next(error);
    }
  }
};
```

Wire up the routes:

```typescript
// src/routes/userRoutes.ts
import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

router.get('/users', userController.getAll);
router.get('/users/:id', userController.getById);
router.post('/users', userController.create);

export default router;
```

```typescript
// src/index.ts
import { createApp } from './app';
import userRoutes from './routes/userRoutes';

const app = createApp();
const PORT = process.env.PORT || 3000;

app.use('/api', userRoutes);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: Function) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Input Validation with Zod

Always validate incoming data. Use Zod for schema validation:

```bash
npm install zod
npm install -D @types/express
```

```typescript
// src/validators/userValidator.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(0).optional()
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
  };
};
```

Apply validation to your routes:

```typescript
import { validate } from '../middleware/validate';
import { createUserSchema } from '../validators/userValidator';

router.post('/users', validate(createUserSchema), userController.create);
```

## Testing with Claude Code and TDD

Claude Code combined with the tdd skill accelerates test-driven development. Create tests before implementing features:

```typescript
// src/__tests__/userController.test.ts
import { userController, User } from '../controllers/userController';
import { Request, Response } from 'express';

// Mock the users array for testing
const mockUsers: User[] = [
  { id: '1', email: 'test@example.com', name: 'Test User', createdAt: new Date() }
];

describe('User Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('getAll', () => {
    it('should return all users', () => {
      userController.getAll(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.any(Array),
        count: expect.any(Number)
      });
    });
  });

  describe('getById', () => {
    it('should return 404 for non-existent user', () => {
      mockReq.params = { id: 'nonexistent' };
      
      userController.getById(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
```

Run tests with Jest:

```bash
npm install -D jest ts-jest @types/jest
npx jest
```

## Documentation Generation

Generate API documentation using the pdf skill for comprehensive guides, or create OpenAPI specs:

```typescript
// src/swagger.ts
import { Request, Response } from 'express';

export const generateOpenAPISpec = () => ({
  openapi: '3.0.0',
  info: {
    title: 'User API',
    version: '1.0.0',
    description: 'Express TypeScript API with Claude Code'
  },
  paths: {
    '/api/users': {
      get: {
        summary: 'Get all users',
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUser' }
            }
          }
        },
        responses: {
          '201': { description: 'User created' }
        }
      }
    }
  }
});
```

## Best Practices Summary

When building Express TypeScript APIs with Claude Code, follow these patterns:

- Use strict TypeScript configuration for type safety
- Implement proper error handling with centralized error middleware
- Validate all inputs using Zod schemas
- Write tests alongside your code using the tdd skill
- Generate documentation automatically
- Use environment variables for configuration
- Implement proper logging with morgan

For persistent context across sessions, consider the supermemory skill to maintain project memory. When building frontend integrations, the frontend-design skill helps create consistent UI patterns that consume your API.

This setup provides a solid foundation for production APIs. Extend with authentication using JWT, add database integration with Prisma or Drizzle ORM, and implement rate limiting for security.

Built by theluckystrike — More at [zovo.one](https://zovo.one)
