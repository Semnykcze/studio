
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getUserSessions, adminUpdateUserCredits, type UserSessionData, searchUserSessionById } from '@/app/admin/actions';
import { LoadingSpinner } from '@/components/loading-spinner';
import { RefreshCw, Edit3, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<UserSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCredits, setEditingCredits] = useState<{ [sessionId: string]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState<UserSessionData | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<UserSessionData | null | undefined>(undefined); // undefined initially, null if no more pages
  const [pageHistory, setPageHistory] = useState<(UserSessionData | null | undefined)[]>([undefined]);


  const { toast } = useToast();

  const fetchSessions = useCallback(async (lastDoc?: UserSessionData | null) => {
    setIsLoading(true);
    try {
      const { sessions: fetchedSessions, newLastVisibleDoc } = await getUserSessions(ITEMS_PER_PAGE, lastDoc);
      setSessions(fetchedSessions);
      setLastVisibleDoc(newLastVisibleDoc);
      setSearchResult(null); 
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch user sessions." });
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions(pageHistory[currentPage -1]);
  }, [fetchSessions, currentPage, pageHistory]);

  const handleNextPage = () => {
    if (lastVisibleDoc) {
        setPageHistory(prev => [...prev, lastVisibleDoc]);
        setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
        setPageHistory(prev => prev.slice(0, -1));
        setCurrentPage(prev => prev - 1);
    }
  };


  const handleCreditChange = (sessionId: string, value: string) => {
    setEditingCredits(prev => ({ ...prev, [sessionId]: value }));
  };

  const handleUpdateCredits = async (sessionId: string) => {
    const newCreditsStr = editingCredits[sessionId];
    if (newCreditsStr === undefined || newCreditsStr.trim() === '') {
      toast({ variant: "destructive", title: "Invalid Input", description: "Credit value cannot be empty." });
      return;
    }
    const newCredits = parseInt(newCreditsStr, 10);
    if (isNaN(newCredits) || newCredits < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid non-negative number for credits." });
      return;
    }

    try {
      await adminUpdateUserCredits(sessionId, newCredits);
      setSessions(prevSessions => prevSessions.map(s => s.id === sessionId ? { ...s, credits: newCredits } : s));
      if (searchResult && searchResult.id === sessionId) {
        setSearchResult(prev => prev ? { ...prev, credits: newCredits } : null);
      }
      setEditingCredits(prev => {
        const newState = { ...prev };
        delete newState[sessionId];
        return newState;
      });
      toast({ title: "Success", description: `Credits for session ${sessionId.substring(0,6)}... updated to ${newCredits}.` });
    } catch (error) {
      console.error("Failed to update credits:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update credits." });
    }
  };
  
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResult(null);
      fetchSessions(); // Reload initial list if search is cleared
      return;
    }
    setIsSearching(true);
    try {
      const result = await searchUserSessionById(searchTerm.trim());
      setSearchResult(result);
      if (!result) {
        toast({variant: "default", title: "Not Found", description: `Session ID "${searchTerm.trim()}" not found.`});
      }
    } catch (error) {
      toast({variant: "destructive", title: "Search Error", description: "Could not perform search."});
    } finally {
      setIsSearching(false);
    }
  };

  const displaySessions = searchResult ? [searchResult] : sessions;

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <CardTitle className="text-2xl">User Sessions & Credits</CardTitle>
          <CardDescription>View and manage credits for user sessions.</CardDescription>
        </div>
        <Button onClick={() => fetchSessions(pageHistory[currentPage-1])} disabled={isLoading || isSearching} variant="outline" size="sm">
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading || isSearching ? 'animate-spin' : ''}`} />
          Refresh List
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-6">
          <Input 
            type="text"
            placeholder="Search by Session ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <LoadingSpinner size="1rem" /> : <Search className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">Search</span>
          </Button>
          { (searchResult || searchTerm) && 
            <Button variant="outline" onClick={() => { setSearchTerm(''); setSearchResult(null); fetchSessions(); }}>
                Clear Search
            </Button>
          }
        </form>

        {isLoading && !isSearching ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner message="Loading sessions..." />
          </div>
        ) : displaySessions.length === 0 && !searchResult ? (
          <p className="text-center text-muted-foreground py-10">
            {searchTerm ? 'No session found for your search term.' : 'No user sessions found.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Session ID</TableHead>
                    <TableHead className="text-center">Credits</TableHead>
                    <TableHead className="w-[250px] text-center">Update Credits</TableHead>
                    <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displaySessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium truncate" title={session.id}>
                        {session.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-center">{session.credits}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Input
                            type="number"
                            value={editingCredits[session.id] ?? session.credits.toString()}
                            onChange={(e) => handleCreditChange(session.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateCredits(session.id)}
                            className="w-20 h-8 text-sm"
                            min="0"
                          />
                          <Button size="sm" variant="outline" onClick={() => handleUpdateCredits(session.id)} className="h-8">
                            <Edit3 className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Set</span>
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {session.lastUpdated ? new Date(session.lastUpdated).toLocaleString() : 
                         session.lastInitialized ? `Initialized: ${new Date(session.lastInitialized).toLocaleDateString()}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!searchResult && sessions.length > 0 && (
                 <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1 || isLoading}
                    >
                       <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!lastVisibleDoc || sessions.length < ITEMS_PER_PAGE || isLoading}
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
