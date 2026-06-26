import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { supabase } from '@/lib/supabase/client';

export default function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } =
        mode === 'sign-in'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (authError) throw authError;
      // RootLayout's auth listener + app/index.tsx redirect handle navigation.
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-1 justify-center gap-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-text">AeroScan</Text>
          <Text className="text-sm text-textSecondary">
            {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
          </Text>
        </View>

        <View className="gap-3">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#9A9DA5"
            autoCapitalize="none"
            keyboardType="email-address"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#9A9DA5"
            secureTextEntry
            className="rounded-xl border border-border bg-surface px-4 py-3 text-text"
          />
        </View>

        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        <Button
          label={mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          onPress={submit}
          loading={loading}
          disabled={!email || !password}
        />

        <Button
          variant="ghost"
          label={mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        />
      </View>
    </ScreenContainer>
  );
}
