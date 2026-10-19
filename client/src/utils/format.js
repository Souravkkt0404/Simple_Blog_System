const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '');
export const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(value)) : '');

export const readingTime = (text = '') => `${Math.max(1, Math.round(text.split(/\s+/).length / 200))} min read`;
