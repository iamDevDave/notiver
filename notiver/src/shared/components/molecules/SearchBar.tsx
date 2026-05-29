import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';

export interface SearchBarProps extends Omit<TextInputProps, 'className' | 'onChangeText'> {
  /** Callback fired with the debounced search value */
  onSearch: (value: string) => void;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Additional NativeWind classes for the container */
  className?: string;
}

export function SearchBar({
  onSearch,
  debounceMs = 300,
  placeholder = 'Search...',
  className = '',
  ...textInputProps
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        onSearch(text);
      }, debounceMs);
    },
    [onSearch, debounceMs],
  );

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  return (
    <View
      className={`flex-row items-center bg-surface-card rounded-inputs border border-border px-md ${className}`}
    >
      <Search size={18} color="#71717A" />

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#71717A"
        selectionColor="#3B82F6"
        className="flex-1 text-text-primary text-body py-md mx-sm"
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        returnKeyType="search"
        autoCorrect={false}
        {...textInputProps}
      />

      {value.length > 0 ? (
        <Pressable
          onPress={handleClear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <X size={18} color="#A1A1AA" />
        </Pressable>
      ) : null}
    </View>
  );
}
