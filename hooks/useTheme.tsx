import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemePalette = {
    surface: string;
    background: string;
    card: string;
    primary: string;
    onPrimary: string;
    secondary: string;
    onSurface: string;
    tertiary: string;
    onTertiary: string;
    onSurfaceVariant: string;
    outline: string;
    outlineVariant: string;
    primaryAlpha: string;
    tertiaryAlpha: string;
    outlineAlpha: string;
    blackAlpha: string;
    whiteAlpha: string;
    surfaceContainer: string;
    surfaceContainerLow: string;
    surfaceContainerHigh: string;
    surfaceContainerLowest: string;
    surfaceContainerHighest: string;
};

export const LightTheme: ThemePalette = {
    surface: '#fcf9f8',
    background: '#fcf9f8',
    card: '#ffffff',
    primary: '#af101a',
    onPrimary: '#ffffff',
    secondary: '#5f5e5e',
    onSurface: '#1b1c1c',
    tertiary: '#705d00',
    onTertiary: '#ffffff',
    onSurfaceVariant: '#5b403d',
    outline: '#8f6f6c',
    outlineVariant: 'rgba(228,190,186,0.5)',
    primaryAlpha: 'rgba(175, 16, 26, 0.08)',
    tertiaryAlpha: 'rgba(112, 93, 0, 0.08)',
    outlineAlpha: 'rgba(228, 190, 186, 0.4)',
    blackAlpha: 'rgba(27, 28, 28, 0.3)',
    whiteAlpha: 'rgba(255, 255, 255, 0.8)',
    surfaceContainer: '#f0eded',
    surfaceContainerLow: '#f6f3f2',
    surfaceContainerHigh: '#eae7e7',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerHighest: '#e5e2e1',
};

export const DarkTheme: ThemePalette = {
    surface: '#111111',
    background: '#111111',
    card: '#1e1e1e',
    primary: '#d4c8a8',
    onPrimary: '#1a1710',
    secondary: '#a3a3a3',
    onSurface: '#f0f0f0',
    tertiary: '#b8aa88',
    onTertiary: '#1a1710',
    onSurfaceVariant: '#cccccc',
    outline: '#555555',
    outlineVariant: 'rgba(255,255,255,0.12)',
    primaryAlpha: 'rgba(212, 200, 168, 0.15)',
    tertiaryAlpha: 'rgba(184, 170, 136, 0.15)',
    outlineAlpha: 'rgba(255, 255, 255, 0.1)',
    blackAlpha: 'rgba(0, 0, 0, 0.5)',
    whiteAlpha: 'rgba(10, 10, 10, 0.8)',
    surfaceContainer: '#1a1a1a',
    surfaceContainerLow: '#161616',
    surfaceContainerHigh: '#222222',
    surfaceContainerLowest: '#111111',
    surfaceContainerHighest: '#2a2a2a',
};

type ThemeContextType = {
    isDark: boolean;
    theme: ThemePalette;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    isDark: false,
    theme: LightTheme,
    toggleTheme: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('@theme_mode');
                if (storedTheme === 'dark') {
                    setIsDark(true);
                } else if (storedTheme === 'light') {
                    setIsDark(false);
                } else {
                    // Default to light mode regardless of system preference
                    setIsDark(false);
                }
            } catch (err) { }
            setLoaded(true);
        };
        loadTheme();
    }, [systemColorScheme]);

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            await AsyncStorage.setItem('@theme_mode', newMode ? 'dark' : 'light');
        } catch (err) { }
    };

    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={{ isDark, theme: isDark ? DarkTheme : LightTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
