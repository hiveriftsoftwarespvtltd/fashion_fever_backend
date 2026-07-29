import { Transform } from 'class-transformer';

export const ToBoolean = () =>
    Transform(({ value }) => {
        if (value === undefined || value === null) {
            return value;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }

        return Boolean(value);
    });


export const ToNumber = () =>
    Transform(({ value }) => {
        if (value === undefined || value === null) {
            return value;
        }

        if (typeof value === 'number') {
            return value;
        }

        const num = Number(value);

        return isNaN(num) ? undefined : num;
    });

export const ToDate = () =>
    Transform(({ value }) => {
        if (value === undefined || value === null || value === '' || value === 'null' || value === 'undefined') {
            return undefined;
        }

        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
    });