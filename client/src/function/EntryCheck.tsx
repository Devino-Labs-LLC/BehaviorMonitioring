export const CheckEmail =  (e: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(e);
}

export const CheckPassword =  (e: string) => {
    const regex = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return regex.test(e);
}

export const CheckUsername =  (e: string) => {
    const regex = /^[a-zA-Z0-9_.-]*$/;
    return regex.test(e);
}
