import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  useWindowDimensions,
} from 'react-native';
import { auth, useSession, type AuthScreen } from '../auth/session';
import { CARD, FONT, INK, MUTED, RED, text } from '../theme';
import { WavyBox } from './SketchShapes';
import brand from '../brand.json';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO = require('../../assets/splash-logo.png');

const TITLE: Record<AuthScreen, string> = { login: 'SIGN IN', signup: 'CREATE ACCOUNT', forgot: 'RESET PASSWORD' };
const BLURB: Record<AuthScreen, string> = {
  login: 'Welcome back! Your progress follows you to any device.',
  signup: 'Optional: save your progress in the cloud and play on any device.',
  forgot: "Enter your email and we'll send you a link to set a new password.",
};

/**
 * Sign in / create an account / reset the password: opened from the profile, never required.
 * Landscape-first: on a roomy screen the SpaceBolt logo sits beside the form; on a short one (or
 * with the on-screen keyboard up) it's just the form, scrolling.
 */
export function AuthSheet() {
  const screen = useSession((s) => s.screen);
  const busy = useSession((s) => s.busy);
  const error = useSession((s) => s.error);
  const info = useSession((s) => s.info);
  const { width, height } = useWindowDimensions();
  const u = Math.max(0.8, Math.min(width / 900, height / 500, 1.25));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [problems, setProblems] = useState<{ email?: string; password?: string }>({});
  useEffect(() => setProblems({}), [screen]);
  if (!screen) return null;

  const withLogo = width >= 640 && height >= 380;
  const submit = () => {
    const p: typeof problems = {};
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) p.email = 'Enter your email address';
    if (screen !== 'forgot' && !password) p.password = 'Enter your password';
    if (screen === 'signup' && password && password.length < 8) p.password = 'At least 8 characters';
    setProblems(p);
    if (Object.keys(p).length) return;
    if (screen === 'login') auth.signIn(e, password);
    else if (screen === 'signup') auth.signUp(e, password, name.trim());
    else auth.resetPassword(e);
  };

  return (
    <View style={styles.scrim}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
        <WavyBox style={{ width: Math.min(width - 24, (withLogo ? 760 : 440) * u), maxHeight: height - 16, padding: 16 * u }} fill={CARD} seed={21}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexDirection: withLogo ? 'row' : 'column', gap: 18 * u, alignItems: withLogo ? 'center' : 'stretch' }}>
            {withLogo && (
              <View style={{ width: '38%', alignItems: 'center', backgroundColor: brand.splashBackground, borderRadius: 12, padding: 14 * u }}>
                <Image source={LOGO} style={{ width: '100%', aspectRatio: brand.logoAspect, maxHeight: height * 0.55 }} resizeMode="contain" />
              </View>
            )}
            <View style={{ flex: withLogo ? 1 : undefined, gap: 8 * u }}>
              <Text style={text(28 * u)}>{TITLE[screen]}</Text>
              <Text style={text(14 * u, { color: MUTED, letterSpacing: 0 })}>{BLURB[screen]}</Text>
              {error ? <Text style={text(14 * u, { color: RED, letterSpacing: 0 })}>{error}</Text> : null}
              {info ? <Text style={text(14 * u, { color: '#3d7a3a', letterSpacing: 0 })}>{info}</Text> : null}

              {screen === 'signup' && (
                <Field u={u} label="NAME (OPTIONAL)" value={name} onChange={setName} placeholder="What should we call you?" autoComplete="name" />
              )}
              <Field
                u={u} label="EMAIL" value={email} onChange={(v) => { setEmail(v); setProblems((p) => ({ ...p, email: undefined })); }}
                placeholder="you@example.com" keyboardType="email-address" autoComplete="email" problem={problems.email}
              />
              {screen !== 'forgot' && (
                <Field
                  u={u} label="PASSWORD" value={password} onChange={(v) => { setPassword(v); setProblems((p) => ({ ...p, password: undefined })); }}
                  placeholder={screen === 'signup' ? 'At least 8 characters' : 'Your password'} secure={!show} onSubmit={submit}
                  autoComplete={screen === 'signup' ? 'new-password' : 'password'} problem={problems.password}
                  right={<Pressable onPress={() => setShow((v) => !v)} hitSlop={10}><Text style={text(13 * u, { color: MUTED })}>{show ? 'HIDE' : 'SHOW'}</Text></Pressable>}
                />
              )}
              {screen === 'login' && (
                <Pressable onPress={() => auth.open('forgot')} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
                  <Text style={text(14 * u, { color: RED, letterSpacing: 0 })}>Forgot password?</Text>
                </Pressable>
              )}

              <Button u={u} primary busy={busy} label={screen === 'forgot' ? 'SEND RESET LINK' : TITLE[screen]} onPress={submit} />

              <View style={[styles.row, { justifyContent: 'space-between', marginTop: 4 * u, flexWrap: 'wrap', gap: 8 }]}>
                {screen === 'login' && <Link u={u} lead="New here?" label="CREATE ACCOUNT" onPress={() => auth.open('signup')} />}
                {screen === 'signup' && <Link u={u} lead="Have an account?" label="SIGN IN" onPress={() => auth.open('login')} />}
                {screen === 'forgot' && <Link u={u} lead="" label="BACK TO SIGN IN" onPress={() => auth.open('login')} />}
                <Link u={u} lead="" label="NOT NOW" onPress={auth.close} muted />
              </View>
            </View>
          </ScrollView>
        </WavyBox>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ u, label, value, onChange, placeholder, secure, keyboardType, autoComplete, problem, onSubmit, right }: {
  u: number; label: string; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean;
  keyboardType?: 'email-address'; autoComplete?: 'email' | 'password' | 'new-password' | 'name'; problem?: string;
  onSubmit?: () => void; right?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 3 * u }}>
      <Text style={text(13 * u, { color: MUTED })}>{label}</Text>
      <View style={[styles.input, { paddingHorizontal: 12 * u, borderColor: problem ? RED : 'rgba(47,43,39,0.35)' }]}>
        <TextInput
          testID={`auth-${label.split(' ')[0].toLowerCase()}`}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#a99f90"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoComplete === 'name' ? 'words' : 'none'}
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          style={{ flex: 1, paddingVertical: 9 * u, fontFamily: FONT, fontSize: 18 * u, color: INK }}
        />
        {right}
      </View>
      {problem ? <Text style={text(12 * u, { color: RED, letterSpacing: 0 })}>{problem}</Text> : null}
    </View>
  );
}

function Button({ u, label, onPress, primary, busy, disabled, icon }: {
  u: number; label: string; onPress: () => void; primary?: boolean; busy?: boolean; disabled?: boolean; icon?: React.ReactNode;
}) {
  return (
    <Pressable
      testID={`auth-btn-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [styles.button, primary && { backgroundColor: INK }, { paddingVertical: 10 * u, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      {busy ? <ActivityIndicator color={primary ? CARD : INK} /> : (
        <View style={[styles.row, { gap: 10 * u }]}>
          {icon}
          <Text style={text(18 * u, { color: primary ? CARD : INK })}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Link({ u, lead, label, onPress, muted }: { u: number; lead: string; label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
      <Text style={text(14 * u, { color: MUTED, letterSpacing: 0 })}>
        {lead ? `${lead} ` : ''}<Text style={{ color: muted ? MUTED : RED }}>{label}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 8, backgroundColor: '#fffaf0', gap: 8 },
  button: { borderWidth: 2.5, borderColor: INK, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD },
});
