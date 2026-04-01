export const CheckEmail = (e: string) => {
    const email = e.trim();
    if (!email || email.includes(' ')) return false;

    const atIndex = email.indexOf('@');
    if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) return false;

    const localPart = email.slice(0, atIndex);
    const domain = email.slice(atIndex + 1);
    if (!localPart || !domain.includes('.')) return false;

    return domain
        .split('.')
        .every((label) => label.length > 0 && !label.startsWith('-') && !label.endsWith('-'));
};

export const CheckPassword =  (e: string) => {
    const regex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(e);
};

export const CheckUsername =  (e: string) => {
    const regex = /^[a-zA-Z0-9_.-]*$/;
    return regex.test(e);
};
