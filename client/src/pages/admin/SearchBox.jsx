import { useState } from 'react';

export default function SearchBox({ placeholder, onSearch, children }) {
  const [value, setValue] = useState('');
  return (
    <form
      className="search-bar compact"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
    >
      <input type="search" value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      {children}
      <button className="btn btn-primary btn-sm">Search</button>
    </form>
  );
}
