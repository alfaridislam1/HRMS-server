import { EmployeeService } from '@services/employeeService';
import { getPostgres } from '@config/postgres';
import { getRedis } from '@config/redis';

// Mock the database and redis
jest.mock('@config/postgres');
jest.mock('@config/redis');

describe('EmployeeService', () => {
    let employeeService: EmployeeService;
    let mockDbQuery: jest.Mock;
    let mockRedisGet: jest.Mock;
    let mockRedisSetex: jest.Mock;
    let mockRedisDel: jest.Mock;

    beforeEach(() => {
        // Setup mocks
        mockDbQuery = jest.fn();
        (getPostgres as jest.Mock).mockReturnValue({
            query: mockDbQuery,
        });

        mockRedisGet = jest.fn();
        mockRedisSetex = jest.fn();
        mockRedisDel = jest.fn();
        (getRedis as jest.Mock).mockReturnValue({
            get: mockRedisGet,
            setex: mockRedisSetex,
            del: mockRedisDel,
        });

        employeeService = new EmployeeService();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('listEmployees', () => {
        it('should return list of employees with pagination', async () => {
            const mockEmployees = [
                {
                    id: '1',
                    employee_id: 'EMP001',
                    first_name: 'John',
                    last_name: 'Doe',
                    email_company: 'john@company.com',
                },
            ];

            mockDbQuery.mockResolvedValueOnce({ rows: mockEmployees });
            mockDbQuery.mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const result = await employeeService.listEmployees('tenant-1', 1, 20);

            expect(result.employees).toEqual(mockEmployees);
            expect(result.total).toBe(1);
            expect(mockDbQuery).toHaveBeenCalledTimes(2);
        });

        it('should apply filters', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });
            mockDbQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

            await employeeService.listEmployees('tenant-1', 1, 20, {
                employment_status: 'active',
            });

            expect(mockDbQuery).toHaveBeenCalled();
            const query = mockDbQuery.mock.calls[0][0];
            expect(query).toContain('employment_status');
        });
    });

    describe('getEmployee', () => {
        it('should return employee from cache if available', async () => {
            const employee = {
                id: '1',
                first_name: 'John',
            };

            mockRedisGet.mockResolvedValueOnce(JSON.stringify(employee));

            const result = await employeeService.getEmployee('tenant-1', '1');

            expect(result).toEqual(employee);
            expect(mockRedisGet).toHaveBeenCalledWith('employee:tenant-1:1');
            expect(mockDbQuery).not.toHaveBeenCalled();
        });

        it('should fetch from database if not cached', async () => {
            const employee = {
                id: '1',
                first_name: 'John',
            };

            mockRedisGet.mockResolvedValueOnce(null);
            mockDbQuery.mockResolvedValueOnce({ rows: [employee] });

            const result = await employeeService.getEmployee('tenant-1', '1');

            expect(result).toEqual(employee);
            expect(mockDbQuery).toHaveBeenCalled();
            expect(mockRedisSetex).toHaveBeenCalledWith(
                'employee:tenant-1:1',
                3600,
                JSON.stringify(employee)
            );
        });

        it('should return null if employee not found', async () => {
            mockRedisGet.mockResolvedValueOnce(null);
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            const result = await employeeService.getEmployee('tenant-1', '1');

            expect(result).toBeNull();
        });
    });

    describe('createEmployee', () => {
        it('should create an employee successfully', async () => {
            const newEmployee = {
                id: 'uuid',
                employee_id: 'EMP001',
                first_name: 'Jane',
                last_name: 'Smith',
                email_company: 'jane@company.com',
                job_title: 'Manager',
                department_id: 'dept-1',
                employment_type: 'full_time',
                start_date: '2024-01-01',
            };

            mockDbQuery.mockResolvedValueOnce({ rows: [newEmployee] });

            const result = await employeeService.createEmployee('tenant-1', newEmployee, 'user-1');

            expect(result).toEqual(newEmployee);
            expect(mockDbQuery).toHaveBeenCalled();
            expect(mockRedisDel).toHaveBeenCalledWith('employees:tenant-1:list');
        });
    });

    describe('updateEmployee', () => {
        it('should update employee successfully', async () => {
            const updatedEmployee = {
                id: '1',
                first_name: 'Johnny',
                last_name: 'Doe',
            };

            mockDbQuery.mockResolvedValueOnce({ rows: [updatedEmployee] });

            const result = await employeeService.updateEmployee(
                'tenant-1',
                '1',
                { first_name: 'Johnny' },
                'user-1'
            );

            expect(result).toEqual(updatedEmployee);
            expect(mockRedisDel).toHaveBeenCalledWith('employee:tenant-1:1');
        });

        it('should throw error if employee not found', async () => {
            mockDbQuery.mockResolvedValueOnce({ rows: [] });

            await expect(
                employeeService.updateEmployee('tenant-1', '1', { first_name: 'Johnny' }, 'user-1')
            ).rejects.toThrow();
        });
    });

    describe('deleteEmployee', () => {
        it('should soft delete employee', async () => {
            mockDbQuery.mockResolvedValueOnce({ rowCount: 1 });

            await employeeService.deleteEmployee('tenant-1', '1', 'user-1');

            expect(mockDbQuery).toHaveBeenCalled();
            expect(mockRedisDel).toHaveBeenCalledWith('employee:tenant-1:1');
        });

        it('should throw error if employee not found', async () => {
            mockDbQuery.mockResolvedValueOnce({ rowCount: 0 });

            await expect(employeeService.deleteEmployee('tenant-1', '1', 'user-1')).rejects.toThrow(
                'Employee not found'
            );
        });
    });
});
