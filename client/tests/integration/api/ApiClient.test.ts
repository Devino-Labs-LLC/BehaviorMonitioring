import { api } from '../../../src/lib/Api';
import axios from 'axios';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    request: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn(),
      },
    },
  })),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockAxiosInstance = (axios.create as jest.Mock).mock.results[0].value;

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('makes POST request with correct data', async () => {
    const mockResponse = {
      data: {
        statusCode: 200,
        data: { id: 1, name: 'Test' },
      },
    };

    mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

    const result = await api('post', '/test-endpoint', { name: 'Test' });

    expect(mockAxiosInstance.request).toHaveBeenCalled();
    expect(result).toEqual(mockResponse.data);
  });

  it('makes GET request correctly', async () => {
    const mockResponse = {
      data: {
        statusCode: 200,
        data: [{ id: 1 }, { id: 2 }],
      },
    };

    mockAxiosInstance.request.mockResolvedValueOnce(mockResponse);

    const result = await api('get', '/test-endpoint');

    expect(mockAxiosInstance.request).toHaveBeenCalled();
    expect(result).toEqual(mockResponse.data);
  });

  it('handles API errors', async () => {
    const mockError = {
      response: {
        status: 400,
        data: {
          statusCode: 400,
          errorMessage: 'Bad Request',
        },
      },
    };

    mockAxiosInstance.request.mockRejectedValueOnce(mockError);

    await expect(api('post', '/test-endpoint', {})).rejects.toEqual(mockError);
  });

  it('handles network errors', async () => {
    const networkError = new Error('Network Error');
    mockAxiosInstance.request.mockRejectedValueOnce(networkError);

    await expect(api('post', '/test-endpoint', {})).rejects.toThrow('Network Error');
  });
});
