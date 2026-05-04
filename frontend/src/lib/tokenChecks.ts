import { isValidJwtShape } from './authToken';

export function runTokenExamples() {
  const examples: Record<string, unknown> = {
    valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def',
    invalid_placeholder: "localStorage.setItem('accessToken', '<PASTE_TOKEN>'); location.reload();",
    invalid_bearer: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def',
    invalid_empty: '',
    invalid_newline: 'eyJhbGciOiJ\nIUzI1NiIsInR5cCI6IkpXVCJ9.abc.def',
  };

  const results: Record<string, boolean> = {};
  Object.entries(examples).forEach(([k, v]) => {
    results[k] = isValidJwtShape(String(v));
  });

  // eslint-disable-next-line no-console
  console.table(results);
  return results;
}

export default runTokenExamples;
