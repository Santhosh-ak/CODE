import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Bug, Zap, GitPullRequest, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const data = [
  { name: 'Mon', critical: 1, high: 2, medium: 5, low: 10 },
  { name: 'Tue', critical: 0, high: 4, medium: 6, low: 12 },
  { name: 'Wed', critical: 2, high: 1, medium: 4, low: 8 },
  { name: 'Thu', critical: 0, high: 3, medium: 7, low: 15 },
  { name: 'Fri', critical: 1, high: 2, medium: 3, low: 9 },
  { name: 'Sat', critical: 0, high: 0, medium: 2, low: 5 },
  { name: 'Sun', critical: 0, high: 1, medium: 4, low: 7 },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Critical Issues Scanned</CardTitle>
            <Shield className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+2% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Bugs Detected</CardTitle>
            <Bug className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48</div>
            <p className="text-xs text-muted-foreground">-14% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Auto-Fixes Applied</CardTitle>
            <Zap className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+18% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">PRs Reviewed</CardTitle>
            <GitPullRequest className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground">+7% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Issues Trend</CardTitle>
            <CardDescription>Security and quality issues detected over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                <XAxis dataKey="name" stroke="#8b949e" axisLine={false} tickLine={false} />
                <YAxis stroke="#8b949e" axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }}
                />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" />
                <Bar dataKey="high" stackId="a" fill="#fb923c" />
                <Bar dataKey="medium" stackId="a" fill="#fbbf24" />
                <Bar dataKey="low" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Latest repositories analyzed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { repo: 'facebook/react', status: 'Clean', time: '2 hours ago', score: 92 },
                { repo: 'vercel/next.js', status: '2 Critical', time: '5 hours ago', score: 85 },
                { repo: 'tailwindlabs/tailwindcss', status: '1 High', time: '1 day ago', score: 96 },
                { repo: 'microsoft/vscode', status: '5 Medium', time: '1 day ago', score: 88 }
              ].map((scan, i) => (
                <Link to={`/report/${scan.repo}`} key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-blue-400">{scan.repo}</span>
                    <span className="text-xs text-muted-foreground">{scan.time}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-semibold ${scan.status.includes('Critical') || scan.status.includes('High') ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {scan.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center">
                      Score: {scan.score} <ArrowUpRight className="w-3 h-3 ml-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
