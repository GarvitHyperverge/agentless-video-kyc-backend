# Folder Structure

## Project Overview
This is a Video KYC (Know Your Customer) Backend API built with Express.js and TypeScript.

## Directory Structure

```
agentless-video-kyc-backend/
├── assets/                    # Static files storage
│   ├── otpVideos/            # OTP verification videos
│   ├── pan/                  # PAN card images
│   └── selfie/               # Selfie images
│
├── docs/                     # Documentation files
│
├── src/                      # Source code
│   ├── app.ts               # Express app configuration
│   ├── server.ts            # Server entry point
│   │
│   ├── config/              # Configuration files
│   │   ├── index.ts         # App configuration
│   │   └── supabase.ts      # Database connection
│   │
│   ├── controllers/         # Request handlers (HTTP layer)
│   │   ├── health.controller.ts
│   │   ├── otpVideo.controller.ts
│   │   ├── panCard.controller.ts
│   │   ├── selfie.controller.ts
│   │   ├── sessionMetadata.controller.ts
│   │   └── verificationSession.controller.ts
│   │
│   ├── routes/              # API route definitions
│   │   ├── index.ts         # Route aggregator
│   │   ├── health.routes.ts
│   │   ├── otpVideo.routes.ts
│   │   ├── panCard.routes.ts
│   │   ├── selfie.routes.ts
│   │   ├── sessionMetadata.routes.ts
│   │   └── verificationSession.routes.ts
│   │
│   ├── services/            # Business logic layer
│   │   ├── faceMatch.service.ts
│   │   ├── fieldMatch.service.ts
│   │   ├── idCardValidation.service.ts
│   │   ├── livenessCheck.service.ts
│   │   ├── otpVideo.service.ts
│   │   ├── panCard.service.ts
│   │   ├── selfie.service.ts
│   │   ├── sessionMetadata.service.ts
│   │   └── verificationSession.service.ts
│   │
│   ├── repositories/        # Database access layer
│   │   ├── businessPartnerPanData.repository.ts
│   │   ├── cardIdValidation.repository.ts
│   │   ├── faceMatchResult.repository.ts
│   │   ├── selfieValidation.repository.ts
│   │   ├── sessionMetadata.repository.ts
│   │   └── verificationSession.repository.ts
│   │
│   ├── models/              # Database schema models
│   │   ├── businessPartnerPanData.model.ts
│   │   ├── cardIdValidation.model.ts
│   │   ├── faceMatchResult.model.ts
│   │   ├── index.ts
│   │   ├── selfieValidation.model.ts
│   │   ├── sessionMetadata.model.ts
│   │   └── verificationSession.model.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── businessPartnerPanData.types.ts
│   │   ├── cardIdValidation.types.ts
│   │   ├── faceMatchResult.types.ts
│   │   ├── idCardValidation.types.ts
│   │   ├── index.ts
│   │   ├── selfieValidation.types.ts
│   │   ├── sessionMetadata.types.ts
│   │   └── verificationSession.types.ts
│   │
│   └── dtos/               # Data Transfer Objects (API contracts)
│       ├── apiResponse.dto.ts
│       ├── idCardValidation.dto.ts
│       ├── otpVideo.dto.ts
│       ├── panCard.dto.ts
│       ├── selfie.dto.ts
│       ├── sessionMetadata.dto.ts
│       └── verificationSession.dto.ts
│
├── node_modules/           # Dependencies (auto-generated)
├── nodemon.json            # Nodemon configuration
├── package.json            # Project dependencies and scripts
├── package-lock.json       # Locked dependency versions
└── tsconfig.json           # TypeScript configuration
```

## Architecture Flow

```
Request → Routes → Controllers → Services → Repositories → Database
```

### Layer Responsibilities

- **Routes**: Define HTTP endpoints and map URLs to controllers
- **Controllers**: Handle HTTP requests/responses, validate input, format responses
- **Services**: Business logic, orchestration, external API calls
- **Repositories**: Database queries and data access
- **Models**: Database schema definitions
- **Types**: TypeScript type definitions for business logic
- **DTOs**: API request/response contracts
