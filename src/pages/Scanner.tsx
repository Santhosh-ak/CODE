import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Github, Loader2, Target, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Scanner() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes('github.com')) {
      setError('Please enter a valid GitHub repository URL.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      // We will redirect to the report page which will fetch from backend
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2].replace('.git', '');
        // Simulate a slight delay to feel like processing is starting
        setTimeout(() => {
          navigate(`/report/${owner}/${repo}`);
        }, 800);
      } else {
        throw new Error('Invalid GitHub URL structure');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start scan.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full mb-4">
          <Github className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-4xl font-bold tracking-tight">Scan a Repository</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Enter any public GitHub repository URL to receive a comprehensive AI-powered security and code quality analysis.
        </p>
      </div>

      <Card className="border-2 border-border shadow-lg shadow-black/50">
        <form onSubmit={handleScan}>
          <CardHeader>
            <CardTitle>Repository URL</CardTitle>
            <CardDescription>Must be a public repository (e.g., https://github.com/facebook/react)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <Input
                placeholder="https://github.com/owner/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-14 md:text-lg px-4 bg-background placeholder:text-muted-foreground/60"
                disabled={loading}
              />
              {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 pt-6">
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium" 
              disabled={loading || !url}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Initializing Deep Scan...
                </>
              ) : (
                'Start Analysis'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center text-emerald-400 mb-1">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            <span className="font-medium">Code Quality</span>
          </div>
          <p className="text-sm text-muted-foreground">Detects anti-patterns, duplicated code, and complex logic using AI.</p>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center text-rose-400 mb-1">
            <ShieldAlert className="w-5 h-5 mr-2" />
            <span className="font-medium">Security Vectors</span>
          </div>
          <p className="text-sm text-muted-foreground">Advanced SAST for 0-days, secrets leakage, and standard vulnerabilities.</p>
        </div>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center text-blue-400 mb-1">
            <Target className="w-5 h-5 mr-2" />
            <span className="font-medium">Performance</span>
          </div>
          <p className="text-sm text-muted-foreground">Identifies memory leaks, slow algorithms, and unoptimized operations.</p>
        </div>
      </div>
    </div>
  );
}
