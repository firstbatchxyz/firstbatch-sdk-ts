# Firstbatch SDK

The FirstBatch SDK provides an interface for integrating vector databases and powering personalized AI experiences in your application.

## Key Features

- Seamlessly manage user sessions with persistent IDs or temporary sessions
- Send signal actions like likes, clicks, etc. to update user embeddings in real-time
- Fetch personalized batches of data tailored to each user's embeddings
- Support for multiple vector database integrations: Pinecone, Weaviate, etc.
- Built-in algorithms for common personalization use cases
- Easy configuration with Python classes and environment variables

## Installation

Install the package from NPM:

```sh
yarn add firstbatch-sdk     # yarn
npm install firstbatch-sdk  # npm
pnpm add firstbatch-sdk     # pnpm
```

## Usage

FirstBatch SDK is used together with an existing vector database client, where you register the client to our SDK and then create personalization sessions from it.

### Adding a Client

First, initialize a Vector Database of your choice; our SDK supports [Pinecone](https://www.npmjs.com/package/@pinecone-database/pinecone), [Weaviate](https://www.npmjs.com/package/weaviate-ts-client), [Typesense](https://www.npmjs.com/package/typesense), and soon Supabase. Let us go over an example using Pinecone.

```ts
import {Pinecone as PineconeClient} from '@pinecone-database/pinecone';
import {Pinecone, FirstBatch, UserAction, Signals} from 'firstbatch-sdk';

// create Pinecone client
const pinecone = new PineconeClient({apiKey: 'pinecone-api-key', environment: 'pinecone-env'});
await pinecone.describeIndex('index-name');
const index = pinecone.index('index-name');
```

Then, create a Vector Store with this index and pass it in the FirstBatch SDK.

```ts
const sdk = new FirstBatch('firstbatch-api-key');

// add client to SDK
const vectorStore = new Pinecone(index);
const vdbid = 'pinecone-example-db';
await sdk.addVdb(vdbid, vectorStore);
```

### Personalization

Now, we can create a session with an algorithm that suits our use-case, and provide personalization to our users.

```ts
// create a session
const session = sdk.session('ALGORITHM_NAME', vdbid);

// make recommendations
const sessionId = session.data;
const [ids, batch] = sdk.batch(sessionId);
```

Suppose that the user has **liked** the **first content** from the `batch` above. We can provide personalization over this as follows:

```ts
const userPick = 0; // i.e. the first content
sdk.addSignal(sessionId, new UserAction(Signals.LIKE), ids[userPick]);
```

### Custom Signals

The `Signals` in the code above contains a set of signals (i.e. labels and weights) that we have prepared for you, but you can also create a Signal with your own parameters:

```ts
import {Signal} from 'firstbatch-sdk';

const mySignal = new Signal('label', 0.5); // label and weight
const userAction = new UserAction(mySignal);
```

## Building

Install the dependencies,

```bash
bun install
```

The following command will check the code with TSC and then build with Parcel.

```bash
bun run build
```

If you get an error like "expected content key ... to exist" simply delete the `.parcel-cache` folder and build again.

## Testing

Run all tests via:

```bash
bun run test
```

Bun will look for `.env.test` during the tests.

## Support

For any issues or queries contact `support@firstbatch.com`.

## Resources

- [User Embedding Guide](https://firstbatch.gitbook.io/user-embeddings/)
- [SDK Documentation](https://firstbatch.gitbook.io/firstbatch-sdk/)

Feel free to dive into the technicalities and leverage FirstBatch SDK for highly personalized user experiences.
