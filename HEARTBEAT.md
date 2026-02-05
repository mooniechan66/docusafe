# Project Docusafe Heartbeat

## Phase 1: Core Logic

- [x] **Implement File Upload:** Use `multer`. Store files in a `uploads/` directory (outside public). Update DB `Document` record.
- [x] **Enforce Free Tier Limit:** Before upload, check `Document` count for the user. If > 0 and plan is FREE, reject with 403.
- [x] **Implement Link Generation:** Create a controller that generates a signed/hashed URL (UUID) and saves it to the `Document`.
- [x] **Implement Watermarking Service:** Use `pdf-lib` (for PDFs) or `sharp` (for images). Create a service function `watermarkFile(filePath, text)` that returns a buffer/stream.
- [x] **Implement "Secure View" Endpoint:** A GET route `/:linkId` that validates and streams the watermarked file.
