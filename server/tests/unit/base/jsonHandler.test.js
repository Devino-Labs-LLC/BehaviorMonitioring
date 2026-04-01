jest.mock('node:fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

const fs = require('node:fs');
const {
  testJson,
  getBackupImportInfo,
  getBackupInfo,
  getImportInfo,
  updateBackupDetails,
  updateImportDetails,
} = require('../../../functions/base/jsonHandler');

describe('jsonHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.log.mockRestore();
  });

  it('logs when the backup info file is readable', () => {
    fs.readFile.mockImplementation((path, encoding, callback) => callback(null, '{}'));

    testJson();

    expect(console.error).toHaveBeenCalledWith('Json file is readable');
  });

  it('logs read errors when the backup info file is not readable', () => {
    const error = new Error('missing file');
    fs.readFile.mockImplementation((path, encoding, callback) => callback(error));

    testJson();

    expect(console.error).toHaveBeenCalledWith('Error reading json file:', error);
  });

  it('returns parsed backup import info', async () => {
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ backupDetail: { ok: true }, importDetail: { ok: false } }))
    );

    await expect(getBackupImportInfo()).resolves.toEqual({
      backupDetail: { ok: true },
      importDetail: { ok: false },
    });
  });

  it('returns only backup details', async () => {
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ backupDetail: { successfulCompletion: true } }))
    );

    await expect(getBackupInfo()).resolves.toEqual({ successfulCompletion: true });
  });

  it('returns only import details', async () => {
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ importDetail: { successfulCompletion: false } }))
    );

    await expect(getImportInfo()).resolves.toEqual({ successfulCompletion: false });
  });

  it('rejects when reading backup import info fails', async () => {
    const error = new Error('read failed');
    fs.readFile.mockImplementation((path, encoding, callback) => callback(error));

    await expect(getBackupImportInfo()).rejects.toThrow('read failed');
  });

  it('rejects when reading backup details fails', async () => {
    const error = new Error('backup failed');
    fs.readFile.mockImplementation((path, encoding, callback) => callback(error));

    await expect(getBackupInfo()).rejects.toThrow('backup failed');
  });

  it('rejects when reading import details fails', async () => {
    const error = new Error('import failed');
    fs.readFile.mockImplementation((path, encoding, callback) => callback(error));

    await expect(getImportInfo()).rejects.toThrow('import failed');
  });

  it('updates backup details and writes the file', () => {
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ backupDetail: {}, importDetail: {} }))
    );
    fs.writeFile.mockImplementation((path, data, callback) => callback(null));

    updateBackupDetails(true);

    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('logs write failures when updating backup details', () => {
    const error = new Error('write failed');
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ backupDetail: {}, importDetail: {} }))
    );
    fs.writeFile.mockImplementation((path, data, callback) => callback(error));

    updateBackupDetails(true);

    expect(console.error).toHaveBeenCalledWith('Error writing file:', error);
  });

  it('logs read failures when updating backup details', () => {
    const error = new Error('read failed');
    fs.readFile.mockImplementation((path, encoding, callback) => callback(error));

    updateBackupDetails(true);

    expect(console.error).toHaveBeenCalledWith('Error reading file:', error);
  });

  it('updates import details and writes the file', () => {
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ backupDetail: {}, importDetail: {} }))
    );
    fs.writeFile.mockImplementation((path, data, callback) => callback(null));

    updateImportDetails(false);

    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('logs write failures when updating import details', () => {
    const error = new Error('write failed');
    fs.readFile.mockImplementation((path, encoding, callback) =>
      callback(null, JSON.stringify({ backupDetail: {}, importDetail: {} }))
    );
    fs.writeFile.mockImplementation((path, data, callback) => callback(error));

    updateImportDetails(false);

    expect(console.error).toHaveBeenCalledWith('Error writing file:', error);
  });

  it('logs read failures when updating import details', () => {
    const error = new Error('read failed');
    fs.readFile.mockImplementation((path, encoding, callback) => callback(error));

    updateImportDetails(false);

    expect(console.error).toHaveBeenCalledWith('Error reading file:', error);
  });
});
