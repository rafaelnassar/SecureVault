import { useState, useEffect, useCallback } from 'react';

export type BreachStatus = 'idle' | 'loading' | 'safe' | 'breached' | 'error';

interface BreachResult {
  status: BreachStatus;
  count: number;
}

async function getSHA1(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function usePasswordBreachCheck(password: string, debounceMs: number = 800) {
  const [result, setResult] = useState<BreachResult>({ status: 'idle', count: 0 });

  const checkPassword = useCallback(async (pwd: string) => {
    if (pwd.length < 4) {
      setResult({ status: 'idle', count: 0 });
      return;
    }

    setResult({ status: 'loading', count: 0 });

    try {
      const fullHash = await getSHA1(pwd);
      const prefix = fullHash.substring(0, 5);
      const suffix = fullHash.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        method: 'GET',
        headers: {
          'Add-Padding': 'true',
        }
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.text();
      const lines = data.split('\n');
      
      const found = lines.find(line => line.split(':')[0] === suffix);
      
      if (found) {
        const count = parseInt(found.split(':')[1].trim(), 10);
        setResult({ status: 'breached', count });
      } else {
        setResult({ status: 'safe', count: 0 });
      }
    } catch {
      setResult({ status: 'error', count: 0 });
    }
  }, []);

  useEffect(() => {
    if (!password || password.length < 4) {
      setResult({ status: 'idle', count: 0 });
      return;
    }

    const timeoutId = setTimeout(() => {
      checkPassword(password);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [password, debounceMs, checkPassword]);

  return result;
}
