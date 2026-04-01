import axios from 'axios';
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

jest.mock('axios');
jest.mock('../../../src/function/debounce', () => ({
  debounceAsync: (fn: unknown) => fn,
}));

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('ApiCalls helpers', () => {
  const backendUrl = 'http://backend.test';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = backendUrl;
  });

  it('gets client names on success', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: {
        statusCode: 200,
        clientData: [
          { clientID: 1, fName: 'Jane', lName: 'Doe' },
          { clientID: 2, fName: 'John', lName: 'Smith' },
        ],
      },
    });

    await expect(getClientNames('coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      fetchedOptions: [
        { value: 1, label: 'Jane Doe' },
        { value: 2, label: 'John Smith' },
      ],
    });

    expect(mockAxios.post).toHaveBeenCalledWith(
      `${backendUrl}/aba/getAllClientInfo`,
      { employeeUsername: 'coach' },
    );
  });

  it('returns an error payload when getting client names fails', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { statusCode: 403, serverMessage: 'Forbidden' },
    });

    await expect(getClientNames('coach')).resolves.toEqual(
      expect.objectContaining({
        statusCode: 403,
        errorMessage: expect.stringContaining('Forbidden'),
      }),
    );
  });

  it('gets active behavior base data on success', async () => {
    const behaviorSkillData = [{ behaviorID: 10 }];
    mockAxios.post.mockResolvedValueOnce({
      data: { statusCode: 200, behaviorSkillData },
    });

    await expect(getClientActiveBehaviorBaseData(1, 10, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData,
    });
  });

  it('gets active behavior detail data in reverse order', async () => {
    const behaviorSkillData = [{ id: 1 }, { id: 2 }];
    mockAxios.post.mockResolvedValueOnce({
      data: { statusCode: 200, behaviorSkillData },
    });

    await expect(getClientActiveBehaviorData(1, 10, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 2 }, { id: 1 }],
    });
  });

  it('gets archived behavior base data with measurement on success', async () => {
    const behaviorSkillData = [{ measurement: 'Duration', id: 1 }];
    mockAxios.post.mockResolvedValueOnce({
      data: { statusCode: 200, behaviorSkillData },
    });

    await expect(getClientArchivedBehaviorBaseData(1, 10, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData,
      measurement: 'Duration',
    });
  });

  it('gets archived behavior detail data in reverse order', async () => {
    const behaviorSkillData = [{ id: 1 }, { id: 2 }];
    mockAxios.post.mockResolvedValueOnce({
      data: { statusCode: 200, behaviorSkillData },
    });

    await expect(getClientArchiveBehaviorData(1, 10, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ id: 2 }, { id: 1 }],
    });
  });

  it('returns error payloads for behavior helper failures', async () => {
    mockAxios.post
      .mockResolvedValueOnce({ data: { statusCode: 404, serverMessage: 'Missing active base' } })
      .mockResolvedValueOnce({ data: { statusCode: 500, serverMessage: 'Missing active detail' } })
      .mockResolvedValueOnce({ data: { statusCode: 401, serverMessage: 'Missing archived base' } })
      .mockResolvedValueOnce({ data: { statusCode: 409, serverMessage: 'Missing archived detail' } });

    await expect(getClientActiveBehaviorBaseData(1, 2, 'coach')).resolves.toEqual(
      expect.objectContaining({
        statusCode: 404,
        errorMessage: expect.stringContaining('Missing active base'),
      }),
    );
    await expect(getClientActiveBehaviorData(1, 2, 'coach')).resolves.toEqual(
      expect.objectContaining({
        statusCode: 500,
        errorMessage: expect.stringContaining('Missing active detail'),
      }),
    );
    await expect(getClientArchivedBehaviorBaseData(1, 2, 'coach')).resolves.toEqual(
      expect.objectContaining({
        statusCode: 401,
        errorMessage: expect.stringContaining('Missing archived base'),
      }),
    );
    await expect(getClientArchiveBehaviorData(1, 2, 'coach')).resolves.toEqual(
      expect.objectContaining({
        statusCode: 409,
        errorMessage: expect.stringContaining('Missing archived detail'),
      }),
    );
  });

  it('exports debounced wrappers that still call the original helpers', async () => {
    mockAxios.post
      .mockResolvedValueOnce({ data: { statusCode: 200, clientData: [] } })
      .mockResolvedValueOnce({ data: { statusCode: 200, behaviorSkillData: [] } })
      .mockResolvedValueOnce({ data: { statusCode: 200, behaviorSkillData: [] } })
      .mockResolvedValueOnce({ data: { statusCode: 200, behaviorSkillData: [{ measurement: 'Rate' }] } })
      .mockResolvedValueOnce({ data: { statusCode: 200, behaviorSkillData: [] } });

    await expect(debouncedGetClientNames('coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      fetchedOptions: [],
    });
    await expect(debouncedGetClientActiveBehaviorBaseData(1, 2, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [],
    });
    await expect(debouncedGetClientActiveBehaviorData(1, 2, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [],
    });
    await expect(debouncedGetClientArchivedBehaviorBaseData(1, 2, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [{ measurement: 'Rate' }],
      measurement: 'Rate',
    });
    await expect(debouncedGetClientArchiveBehaviorData(1, 2, 'coach')).resolves.toEqual({
      statusCodeRecieved: 200,
      behaviorSkillData: [],
    });
  });
});
