jest.mock('../../../middleware/helpers/authorizationHelper', () => ({
    verifyABAAuthorization: jest.fn(),
    verifyBasicAuthentication: jest.fn(),
}));

jest.mock('../../../middleware/helpers/ABAQueries', () => ({
    abaClientExistByID: jest.fn(),
    abaGetBehaviorOrSkill: jest.fn(),
    abaSessionNoteDataByClientIDExists: jest.fn(),
    abaSessionNoteDataByClientID: jest.fn(),
}));

const controller = require('../../../controllers/ABAController');
const { verifyBasicAuthentication } = require('../../../middleware/helpers/authorizationHelper');
const abaQueries = require('../../../middleware/helpers/ABAQueries');

describe('ABAController read access', () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            body: {
                clientID: 1,
                employeeUsername: 'techuser',
            },
        };
        res = {
            json: jest.fn(),
        };

        verifyBasicAuthentication.mockResolvedValue({
            username: 'techuser',
            role: 'employee',
            companyID: 1,
            companyName: 'Test Company',
        });
    });

    it('allows basic authenticated users to fetch client target behaviors', async () => {
        abaQueries.abaClientExistByID.mockResolvedValue(true);
        abaQueries.abaGetBehaviorOrSkill.mockResolvedValue([
            { bsID: 1, name: 'Aggression', measurement: 'Frequency' },
        ]);

        await controller.getClientTargetBehavior(req, res);

        expect(verifyBasicAuthentication).toHaveBeenCalledWith(req, res);
        expect(res.json).toHaveBeenCalledWith({
            statusCode: 200,
            behaviorSkillData: [{ bsID: 1, name: 'Aggression', measurement: 'Frequency' }],
        });
    });

    it('allows basic authenticated users to fetch session notes', async () => {
        abaQueries.abaClientExistByID.mockResolvedValue(true);
        abaQueries.abaSessionNoteDataByClientIDExists.mockResolvedValue(true);
        abaQueries.abaSessionNoteDataByClientID.mockResolvedValue([
            { sessionNoteDataID: 1, sessionNotes: 'Test note' },
        ]);

        await controller.getSessionNotes(req, res);

        expect(verifyBasicAuthentication).toHaveBeenCalledWith(req, res);
        expect(res.json).toHaveBeenCalledWith({
            statusCode: 200,
            sessionNotesData: [{ sessionNoteDataID: 1, sessionNotes: 'Test note' }],
        });
    });
});
