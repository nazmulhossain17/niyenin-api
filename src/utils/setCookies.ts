import { Response } from "express";


export const setCookies = (res: Response, name: string, value: string) => {
    res.cookie(name, value, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 1000_60_60_24_365, // 1 year
    })
}