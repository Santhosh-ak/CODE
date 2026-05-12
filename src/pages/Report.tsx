import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldAlert, Cpu, AlertTriangle, AlertCircle, FileCode2, ArrowLeft, TerminalSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalysisResult {
  summary: {
    securityScore: number;
    qualityScore: number;
    maintainabilityScore: number;
    overview: string;
  };
  issues: {
    id: string;
    file: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    suggestedFix: string;
  }[];
}

export default function Report() {
  const { owner, repo } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (!owner || !repo) return;
    
    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ repoUrl: `https://github.com/${owner}/${repo}` }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Analysis failed. Make sure the API key is set and repo is public.');
        }

        const json = await response.json();
        setData(json.analysis);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
        <div className="relative">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-pulse"></div>
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Analyzing Repository</h3>
          <p className="text-muted-foreground">Cloning {owner}/{repo}, running static analysis, and querying AI models...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-6 flex flex-col items-center text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500" />
          <h3 className="text-xl font-semibold text-rose-500">Analysis Failed</h3>
          <p className="text-slate-300">{error || "An unknown error occurred."}</p>
          <Link to="/scanner" className="text-indigo-400 hover:text-indigo-300 transition-colors mt-4 inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Scanner
          </Link>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch(severity.toLowerCase()) {
      case 'critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch(severity.toLowerCase()) {
      case 'critical': return <ShieldAlert className="w-4 h-4 mr-1.5" />;
      case 'high': return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      case 'medium': return <AlertCircle className="w-4 h-4 mr-1.5" />;
      default: return <Cpu className="w-4 h-4 mr-1.5" />;
    }
  };

  const overallScore = Math.round((data.summary.securityScore + data.summary.qualityScore + data.summary.maintainabilityScore) / 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{repo}</h2>
          <p className="text-muted-foreground text-lg">by {owner}</p>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-4xl font-black text-white">{overallScore}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Overall Score</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">{data.summary.securityScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Progress value={data.summary.securityScore} className="h-2 mt-4 [&>div]:bg-emerald-500" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quality Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">{data.summary.qualityScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Progress value={data.summary.qualityScore} className="h-2 mt-4 [&>div]:bg-blue-500" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Maintainability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold">{data.summary.maintainabilityScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Progress value={data.summary.maintainabilityScore} className="h-2 mt-4 [&>div]:bg-indigo-500" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Architectural Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-invert max-w-none text-slate-300 text-base leading-relaxed">
            <ReactMarkdown>{data.summary.overview}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold tracking-tight">Identified Issues ({data.issues.length})</h3>
          <TabsList className="bg-background border border-border">
            <TabsTrigger value="all">All Issues</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-6 mt-0">
          {data.issues.map((issue, idx) => (
            <Card key={issue.id || idx} className="border-border shadow-md bg-[#1c2128]">
              <CardHeader className="pb-3 border-b border-border bg-card/40">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground mb-2">
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>{issue.file}</span>
                    </div>
                    <CardTitle className="text-lg text-slate-100">{issue.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className={`${getSeverityColor(issue.severity)} flex px-2.5 py-0.5 items-center capitalize`}>
                    {getSeverityIcon(issue.severity)}
                    {issue.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown>{issue.description}</ReactMarkdown>
                </div>
                
                {issue.suggestedFix && (
                  <div className="mt-6">
                    <div className="flex items-center space-x-2 text-sm font-medium text-emerald-400 mb-2">
                      <TerminalSquare className="w-4 h-4" />
                      <span>Suggested Fix</span>
                    </div>
                    <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-4 overflow-x-auto text-sm font-mono text-[#d4d4d4] shadow-inner">
                      <pre><code>{issue.suggestedFix}</code></pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {data.issues.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
              No issues detected. Outstanding repository health!
            </div>
          )}
        </TabsContent>
        {/* Simplified sub-views for demonstration */}
        <TabsContent value="security" className="space-y-6 mt-0">
          {data.issues.filter(i => i.type.toLowerCase().includes('security')).map((issue, idx) => (
             <Card key={issue.id || idx} className="border-border shadow-md bg-[#1c2128]">
               {/* Same card content as above, abstracted normally but inlined for space */}
               <CardHeader className="pb-3 border-b border-border bg-card/40">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground mb-2">
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>{issue.file}</span>
                    </div>
                    <CardTitle className="text-lg text-slate-100">{issue.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className={`${getSeverityColor(issue.severity)} flex px-2.5 py-0.5 items-center capitalize`}>
                    {getSeverityIcon(issue.severity)}
                    {issue.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown>{issue.description}</ReactMarkdown>
                </div>
                {issue.suggestedFix && (
                  <div className="mt-6">
                    <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-md p-4 overflow-x-auto text-sm font-mono text-[#d4d4d4]">
                      <pre><code>{issue.suggestedFix}</code></pre>
                    </div>
                  </div>
                )}
              </CardContent>
             </Card>
          ))}
          {data.issues.filter(i => i.type.toLowerCase().includes('security')).length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
              No security issues detected.
            </div>
          )}
        </TabsContent>
        <TabsContent value="quality" className="space-y-6 mt-0">
           {data.issues.filter(i => !i.type.toLowerCase().includes('security')).map((issue, idx) => (
             <Card key={issue.id || idx} className="border-border shadow-md bg-[#1c2128]">
               <CardHeader className="pb-3 border-b border-border bg-card/40">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs font-mono text-muted-foreground mb-2">
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>{issue.file}</span>
                    </div>
                    <CardTitle className="text-lg text-slate-100">{issue.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className={`${getSeverityColor(issue.severity)} flex px-2.5 py-0.5 items-center capitalize`}>
                    {getSeverityIcon(issue.severity)}
                    {issue.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <ReactMarkdown>{issue.description}</ReactMarkdown>
                </div>
                {issue.suggestedFix && (
                  <div className="mt-6">
                    <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-md p-4 overflow-x-auto text-sm font-mono text-[#d4d4d4]">
                      <pre><code>{issue.suggestedFix}</code></pre>
                    </div>
                  </div>
                )}
              </CardContent>
             </Card>
          ))}
          {data.issues.filter(i => !i.type.toLowerCase().includes('security')).length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-lg border border-border">
              No code quality issues detected.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
