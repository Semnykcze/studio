
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SlidersHorizontal, Unlock, AlertTriangle } from 'lucide-react';

const DEV_UNLOCKED_KEY = 'visionary-dev-mode-unlocked';
const DEV_FILTERS_OFF_KEY = 'visionary-dev-filters-off';

export default function AdminPage() {
  const [devCode, setDevCode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [disableAllFilters, setDisableAllFilters] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unlocked = localStorage.getItem(DEV_UNLOCKED_KEY) === 'true';
    if (unlocked) {
      setIsUnlocked(true);
      const filtersOff = localStorage.getItem(DEV_FILTERS_OFF_KEY) === 'true';
      setDisableAllFilters(filtersOff);
    }
  }, []);

  const handleUnlock = () => {
    if (devCode === 'DevMasakr') {
      localStorage.setItem(DEV_UNLOCKED_KEY, 'true');
      setIsUnlocked(true);
      toast({
        title: 'Developer Mode Unlocked!',
        description: 'The developer options are now visible.',
      });
      setDevCode('');
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Code',
        description: 'The developer code is not correct.',
      });
    }
  };

  const handleFilterToggle = (checked: boolean) => {
    setDisableAllFilters(checked);
    localStorage.setItem(DEV_FILTERS_OFF_KEY, String(checked));
    toast({
      title: `All Safety Filters ${checked ? 'Disabled' : 'Enabled'}`,
      description: checked
        ? 'The most permissive safety settings will now be used for all generations.'
        : 'Default safety settings have been restored.',
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage application settings and developer options.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
                <SlidersHorizontal className="mr-2 h-5 w-5" />
                General Settings
            </CardTitle>
            <CardDescription>
              General application settings will appear here in the future.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground">No general settings are available yet.</p>
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Unlock className="mr-2 h-5 w-5" />
                    Developer Options
                </CardTitle>
                <CardDescription>
                    Unlock advanced settings with a developer code.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!isUnlocked ? (
                     <div className="flex w-full items-center space-x-2">
                        <Input
                            type="password"
                            placeholder="Enter developer code..."
                            value={devCode}
                            onChange={(e) => setDevCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        />
                        <Button onClick={handleUnlock}>Unlock</Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="disable-filters-switch" className="text-base font-medium">
                                    Disable All Safety Filters
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    Overrides all other settings to use the most permissive safety level.
                                </p>
                            </div>
                            <Switch
                                id="disable-filters-switch"
                                checked={disableAllFilters}
                                onCheckedChange={handleFilterToggle}
                            />
                        </div>
                         <div className="flex items-start text-destructive space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="text-xs">
                                <p className="font-semibold">Warning</p>
                                <p>
                                    Disabling safety filters may result in the generation of content that is unexpected or inappropriate. This setting will persist across sessions. Use responsibly.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
