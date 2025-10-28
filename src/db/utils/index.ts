import fs from 'fs';
import path from 'path';
import { pool } from '..';
const beforeSql = fs.readFileSync(path.join(__dirname, 'utils.before.db.sql'), 'utf8');
const aftereSql = fs.readFileSync(path.join(__dirname, 'utils.after.db.sql'), 'utf8');

export const process_db_utils = () => {
    return ({
        async beforeMigrate() {
            await pool.query(beforeSql);
        },
        async afterMigrate() {
            await pool.query(aftereSql);
            console.log('end create trigger functtion')
        }
    });
};