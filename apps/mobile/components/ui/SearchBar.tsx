// SearchBar primitive — Plan 8 Phase C3.
//
// Thin preset over the Field primitive (see ./Field.tsx). Matches the
// design bundle's `SearchBar` (components.jsx) for the editable input
// variant — leading search icon, `search` keyboardType, no label,
// localized default placeholder.
//
// The original web SearchBar also supports an `onClick` mode that turns
// the bar into a button that opens a search modal. RN screens that need
// that affordance can wrap the SearchBar in a Pressable themselves —
// keeping this component focused on the input use case keeps the API
// surface tight (and Field already covers everything we need).

import { Field, type FieldProps } from './Field';

export interface SearchBarProps {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Ara…',
  autoFocus,
}: SearchBarProps) {
  const props: FieldProps = {
    icon: 'search',
    type: 'search',
    value,
    onChange,
    placeholder,
    autoFocus,
  };
  return <Field {...props} />;
}
