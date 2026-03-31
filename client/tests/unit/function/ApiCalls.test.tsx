import {
  debouncedGetClientActiveBehaviorBaseData,
  debouncedGetClientActiveBehaviorData,
  debouncedGetClientArchiveBehaviorData,
  debouncedGetClientArchivedBehaviorBaseData,
  debouncedGetClientNames,
  getClientActiveBehaviorBaseData,
  getClientActiveBehaviorData,
  getClientArchiveBehaviorData,
  getClientArchivedBehaviorBaseData,
  getClientNames,
} from '../../../src/function/ApiCalls';
import Axios from 'axios';

jest.mock('axios');
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: (...args: any[]) => unknown) => (...args: any[]) => fn(...args),
}));

const mockPost = Axios.post as jest.MockedFunction<typeof Axios.post>;

describe('ApiCalls helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:3001';
  });

  it('maps client names from the API response', async () => {
    mockPost.mockResolvedValue({
      data: {
        statusCode: 200,
        clientData: [{ clientID: 4, fName: 'Jane', lName: 'Doe' }],
      },
    } as any);

    await expect(getClientNames('tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      fetchedOptions: [{ value: 4, label: 'Jane Doe' }],
    });

    await expect(debouncedGetClientNames('tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      fetchedOptions: [{ value: 4, label: 'Jane Doe' }],
    });
  });

  it('returns reversed active behavior data', async () => {
    mockPost.mockResolvedValue({
      data: {
        statusCode: 200,
        behaviorSkillData: [{ id: 1 }, { id: 2 }],
      },
    } as any);

    await expect(getClientActiveBehaviorData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 2 }, { id: 1 }],
    });

    await expect(debouncedGetClientActiveBehaviorData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 1 }, { id: 2 }],
    });
  });

  it('returns active behavior base data', async () => {
    mockPost.mockResolvedValue({
      data: {
        statusCode: 200,
        behaviorSkillData: [{ id: 7, measurement: 'Frequency' }],
      },
    } as any);

    await expect(getClientActiveBehaviorBaseData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 7, measurement: 'Frequency' }],
    });

    await expect(debouncedGetClientActiveBehaviorBaseData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 7, measurement: 'Frequency' }],
    });
  });

  it('returns archived behavior base data with measurement', async () => {
    mockPost.mockResolvedValue({
      data: {
        statusCode: 200,
        behaviorSkillData: [{ id: 7, measurement: 'Duration' }],
      },
    } as any);

    await expect(getClientArchivedBehaviorBaseData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 7, measurement: 'Duration' }],
      measurement: 'Duration',
    });

    await expect(debouncedGetClientArchivedBehaviorBaseData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 7, measurement: 'Duration' }],
      measurement: 'Duration',
    });
  });

  it('returns reversed archived behavior data', async () => {
    mockPost.mockResolvedValue({
      data: {
        statusCode: 200,
        behaviorSkillData: [{ id: 1 }, { id: 2 }],
      },
    } as any);

    await expect(getClientArchiveBehaviorData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 2 }, { id: 1 }],
    });

    await expect(debouncedGetClientArchiveBehaviorData(1, 9, 'tester')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 1 }, { id: 2 }],
    });
  });

  it('returns error payloads when the API rejects', async () => {
    mockPost.mockRejectedValue(new Error('boom'));

    await expect(getClientNames('tester')).resolves.toEqual(
      expect.objectContaining({ errorMessage: expect.stringContaining('boom') }),
    );
    await expect(getClientActiveBehaviorBaseData(1, 9, 'tester')).resolves.toEqual(
      expect.objectContaining({ errorMessage: expect.stringContaining('boom') }),
    );
  });
});
