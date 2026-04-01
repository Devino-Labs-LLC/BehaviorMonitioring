const fs = require('node:fs');
const backupImportInfoPath = './config/database/backupImportInfo.json';

function testJson () {
    // Read the JSON file
    fs.readFile(backupImportInfoPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading json file:', err);
            return;
        }

        console.error('Json file is readable');
    });
}

const getBackupImportInfo = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(backupImportInfoPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                reject(err); // Reject the promise with the error
                return;
            }
            const jsonData = JSON.parse(data);
            resolve(jsonData);
        });
    });
};

const getBackupInfo = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(backupImportInfoPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                reject(err); // Reject the promise with the error
                return;
            }
            const jsonData = JSON.parse(data);
            resolve(jsonData.backupDetail);
        });
    });
};

const getImportInfo = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(backupImportInfoPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                reject(err); // Reject the promise with the error
                return;
            }
            const jsonData = JSON.parse(data);
            resolve(jsonData.importDetail);
        });
    });
};

function updateBackupDetails(successfulCompletion) {
    const currentDate = new Date();
    const convertedDate = currentDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
    // Read the JSON file
    fs.readFile(backupImportInfoPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }
        
        let jsonData = JSON.parse(data);
        jsonData.backupDetail.executionDate = convertedDate + " EST";
        jsonData.backupDetail.successfulCompletion = successfulCompletion;
        
        fs.writeFile(backupImportInfoPath, JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('Data has been modified and saved.');
        });
    });
}

function updateImportDetails(successfulCompletion) {
    const currentDate = new Date();
    const convertedDate = currentDate.toLocaleString('en-US', { timeZone: 'America/New_York' });
    // Read the JSON file
    fs.readFile(backupImportInfoPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }
        
        let jsonData = JSON.parse(data);
        jsonData.importDetail.executionDate = convertedDate + " EST";
        jsonData.importDetail.successfulCompletion = successfulCompletion;
        
        fs.writeFile(backupImportInfoPath, JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('Data has been modified and saved.');
        });
    });
}

module.exports = {
    testJson,
    getBackupImportInfo,
    getBackupInfo,
    getImportInfo,
    updateBackupDetails,
    updateImportDetails
}
