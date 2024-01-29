<p align="center">
  <!-- <img src="https://raw.githubusercontent.com/firstbatchxyz/firstbatch-sdk-ts/master/logo.svg" alt="logo" width="142"> -->
  <img src="./logo.svg" alt="logo" width="142">
</p>

<p align="center">
  <h1 align="center">
    FirstBatch SDK
  </h1>
  <p align="center">
    <i>FirstBatch SDK provides an interface for integrating vector databases and powering personalized AI experiences in your application.</i>
  </p>
</p>

<p align="center">
    <a href="https://opensource.org/licenses/MIT" target="_blank">
        <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-7CB9E8.svg">
    </a>
    <a href="https://www.npmjs.com/package/firstbatch" target="_blank">
        <img alt="NPM" src="https://img.shields.io/npm/v/firstbatch?logo=npm&color=CB3837">
    </a>
    <!-- <a href="./.github/workflows/test.yml" target="_blank">
        <img alt="Workflow: Tests" src="https://github.com/firstbatchxyz/firstbatch-sdk-ts/actions/workflows/test.yml/badge.svg?branch=master">
    </a> -->
    <a href="https://discord.gg/2wuU9ym6fq" target="_blank">
        <img alt="Discord" src="https://dcbadge.vercel.app/api/server/2wuU9ym6fq?style=flat">
    </a>
</p>

- [x] Seamlessly manage user sessions with persistent IDs or temporary sessions.
- [x] Send signal actions like likes, clicks, etc. to update user embeddings in real-time.
- [x] Fetch personalized batches of data tailored to each user's embeddings.
- [x] Support for multiple vector database integrations: Pinecone, Weaviate, etc.
- [x] Built-in algorithms for common personalization use cases.

For more information, see the [User Embedding Guide](https://firstbatch.gitbook.io/user-embeddings/) or the [SDK Documentation](https://firstbatch.gitbook.io/firstbatch-sdk/).

## Installation

Install the package from NPM:

```sh
npm install firstbatch  # npm
yarn add firstbatch     # yarn
pnpm add firstbatch     # pnpm
```

## Usage

FirstBatch SDK is used together with an existing vector store, where you register the vector store to our SDK and then create personalization sessions from it.

### Adding a Client

First, initialize a Vector Database of your choice; our SDK supports:

- [x] [Pinecone](https://www.npmjs.com/package/@pinecone-database/pinecone)
- [x] [Weaviate](https://www.npmjs.com/package/weaviate-ts-client)
- [ ] [Typesense](https://www.npmjs.com/package/typesense) (work in progress)
- [ ] [Supabase](https://www.npmjs.com/package/@supabase/supabase-js) (work in progress)

Let us go over an example using Pinecone.

```ts
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Pinecone, FirstBatch, TODO:!, Signals} from 'firstbatch';

// create Pinecone client
const pinecone = new PineconeClient({apiKey: 'pinecone-api-key', environment: 'pinecone-env'});
await pinecone.describeIndex('index-name');
const index = pinecone.index('index-name');
```

Then, create a Vector Store with this index and pass it in the FirstBatch SDK.

```ts
// create SDK
const personalized = await FirstBatch.new('firstbatch-api-key');

// add client to SDK
const vectorStore = new Pinecone(index);
const vdbid = 'pinecone-example-db';
await personalized.addVectorStore(vdbid, vectorStore);
```

### Personalization

Now, we can create a session with an algorithm that suits our use-case, and provide personalization to our users.

```ts
// create a session
const session = personalized.session('ALGORITHM_NAME', vdbid);

// make recommendations
const sessionId = session.data;
const [ids, batch] = personalized.batch(sessionId);
```

Suppose that the user has **liked** the **first content** from the `batch` above. We can provide personalization over this as follows:

```ts
const userPick = 0; // i.e. the first content
personalized.addSignal(sessionId, new TODO:!(Signals.LIKE), ids[userPick]);
```

### Custom Signals

The `Signals` in the code above contains a set of signals (i.e. labels and weights) that we have prepared for you, but you can also create a Signal with your own parameters:

```ts
import {Signal} from 'firstbatch';

const mySignal = new Signal('label', 0.5); // label and weight
const userAction = new TODO:!(mySignal);
```

## Building

Install the dependencies,

```bash
bun install
```

The following command will check the code with TSC and then build with Parcel.

```bash
bun run build
bun b # alternative
```

If you get an error like "expected content key ... to exist" simply delete the `.parcel-cache` folder and build again.

## Testing

Run all tests via:

```bash
bun run test
bun t # alternative
```

Bun will look for `.env.test` during the tests.

## Styling

Check formatting:

```sh
bun format
```

Lint everything:

```sh
bun lint
```
