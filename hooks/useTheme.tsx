import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    onSurfaceVariant: string;
    outline: string;
    primaryAlpha: string;
    tertiaryAlpha: string;
    outlineAlpha: string;
    blackAlpha: string;
    whiteAlpha: string;
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
    onSurfaceVariant: '#5b403d',
    outline: '#8f6f6c',
    primaryAlpha: 'rgba(175, 16, 26, 0.08)',
    tertiaryAlpha: 'rgba(112, 93, 0, 0.08)',
    outlineAlpha: 'rgba(228, 190, 186, 0.4)',
    blackAlpha: 'rgba(27, 28, 28, 0.3)',
    whiteAlpha: 'rgba(255, 255, 255, 0.8)',
};

export const DarkTheme: ThemePalette = {
    surface: '#0a0a0a',
    background: '#0a0a0a',
    card: '#141414',
    primary: '#f2a900', // Rutgers Gold!
    onPrimary: '#000000',
    secondary: '#a3a3a3',
    onSurface: '#fdfdfd',
    tertiary: '#af101a', // Scarlet Red for accents
    onSurfaceVariant: '#d1d1d1',
    outline: '#444444',
    primaryAlpha: 'rgba(242, 169, 0, 0.15)',
    tertiaryAlpha: 'rgba(175, 16, 26, 0.15)',
    outlineAlpha: 'rgba(255, 255, 255, 0.12)',
    blackAlpha: 'rgba(0, 0, 0, 0.5)',
    whiteAlpha: 'rgba(10, 10, 10, 0.8)',
};

type ThemeContextType = {
    isDark: boolean;
    theme: ThemePalette;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
    isDark: false,
    theme: LightTheme,
    toggleTheme: () => {},
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
                    setIsDark(systemColorScheme === 'dark');
                }
            } catch (err) {}
            setLoaded(true);
        };
        loadTheme();
    }, [systemColorScheme]);

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            await AsyncStorage.setItem('@theme_mode', newMode ? 'dark' : 'light');
        } catch (err) {}
    };

    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={{ isDark, theme: isDark ? DarkTheme : LightTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
