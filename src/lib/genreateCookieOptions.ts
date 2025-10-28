import { CookieOptions } from "express"

const generateCookieOptions = (): CookieOptions => {
    return ({
        httpOnly: true,
        secure: true, // Use true if HTTPS
        sameSite: 'none',
        partitioned: true,
        maxAge: 1000_60_60_24_365
    })
}

export default generateCookieOptions