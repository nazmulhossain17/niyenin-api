import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import config from '../config/config';
import { getAuthenticatedUserRoleLevel } from '../lib/auth-data/getAuthenticatedUserRoleLevel';

const simpleAuth = (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (user?.userId) {
        return next();
    } else {
        res.clearCookie(config.cookie_token_name!);
        return (res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'unauthorized',
        }));
    }
};

const onlyUserAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log(req.user);
    console.log({ token: req.token })
    if (req.user?.userId) {
        return next();
    } else {
        return (res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'unauthorized:full',
        }));
    }
};


const checkUserRoleLevel = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'Unauthorized: User or organization code not found.',
        });
    }

    try {
        // Fetch the user's role level from the organization roles
        const userRole = await getAuthenticatedUserRoleLevel({ userId })
        // const [userRole] = await db.select({
        //     level: rolesTable.level,
        //     name: rolesTable.name
        // })
        //     .from(orgRolesTable)
        //     .leftJoin(rolesTable, and(eq(rolesTable.roleId, orgRolesTable.roleId), eq(rolesTable.specified_for, 'org')))
        //     .where(and(eq(orgRolesTable.org_code, orgCode), eq(orgRolesTable.userId, userId))).limit(1);
        req.userRole = userRole;
        if (typeof userRole?.level === 'number') {
            next();
        } else {
            return res.status(StatusCodes.FORBIDDEN).json({
                message: 'Forbidden: Insufficient permissions.',
            });
        }
    } catch (error) {
        console.error('Error checking user role level:', error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Internal Server Error: Unable to check user role level.',
        });
    }
};


export const auth = Object.assign(simpleAuth, {
    simpleAuth,
    onlyUserAuth,
    checkUserRoleLevel
});