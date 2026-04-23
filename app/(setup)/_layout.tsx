import { Stack } from 'expo-router';

export default function SetupLayout() {
    return (
        <Stack>
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="details" options={{ headerShown: false }} />
            <Stack.Screen name="interests" options={{ headerShown: false }} />
            <Stack.Screen name="photos" options={{ headerShown: false }} />
            <Stack.Screen name="preferences" options={{ headerShown: false }} />
        </Stack>
    );
}
