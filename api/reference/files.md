---
title: Files
---

# Files

Manage files that you can attach to vector stores. Filenames are stored Base64-encoded but responses return decoded names.

## Endpoints

### GET `/v1/files`

Returns `{ object: "list", data: File[] }`.

```ts
await fetch("https://agents.missionsquad.ai/v1/files", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

### POST `/v1/files` (multipart/form-data)

Fields:

- `file`: binary (required)
- `purpose`: string (required), e.g., `"vector_store"`
- `relativePath`: string (optional) — for grouping/preserving relative paths
- `collectionName`: string (optional) — convenience tag

Returns: `FileUpload` with fields `{ id, object, bytes, created_at, filename, purpose }`.

Example (axios):

```ts
import axios from "axios";
import FormData from "form-data";
import fs from "node:fs";

const form = new FormData();
form.append("file", fs.createReadStream("./docs/paper.pdf"));
form.append("purpose", "vector_store");
// optional:
form.append("relativePath", "docs/");
form.append("collectionName", "Research Papers");

const res = await axios.post("https://agents.missionsquad.ai/v1/files", form, {
  headers: { "x-api-key": process.env.MSQ_API_KEY!, ...form.getHeaders() }
});
console.log(res.data.id);
```

---

### GET `/v1/files/:id`

Return file metadata.

```ts
await fetch("https://agents.missionsquad.ai/v1/files/file_abc123", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

### DELETE `/v1/files/:id`

Delete your file and its vector-store associations.

```ts
await fetch("https://agents.missionsquad.ai/v1/files/file_abc123", {
  method: "DELETE",
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
```

---

### GET `/v1/files/:id/content`

Returns the raw file content with appropriate `Content-Type` where determinable.

```ts
const res = await fetch("https://agents.missionsquad.ai/v1/files/file_abc123/content", {
  headers: { "x-api-key": process.env.MSQ_API_KEY! }
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const buf = await res.arrayBuffer();
// handle content-type if needed: res.headers.get("content-type")
```

## See also

- [Vector Stores](/api/reference/vector-stores)
- [Convenience Endpoints](/api/reference/convenience)
