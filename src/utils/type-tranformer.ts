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