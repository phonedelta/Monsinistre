// French typography: a line never breaks before ; : ? ! » nor after «.
export const fr = (text: string) => text.replace(/ ([;:?!»])/g, ' $1').replace(/« /g, '« ');
