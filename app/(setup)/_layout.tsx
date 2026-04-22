import { Stack } from 'expo-router';

export default function SetupLayout() {
    return (
        <Stack>
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="questionnaire" options={{ headerShown: false }} />
        </Stack>
    );
}
