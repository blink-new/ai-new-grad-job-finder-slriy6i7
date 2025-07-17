import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Search, MapPin, DollarSign, Clock, Bookmark, ExternalLink, Sparkles, Filter, Users, Building } from 'lucide-react'

interface Job {
  id: string
  title: string
  company: string
  location: string
  salary: string
  type: string
  description: string
  requirements: string[]
  posted: string
  remote: boolean
  experience_level: string
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [savedJobs, setSavedJobs] = useState<string[]>([])

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) return

    const loadSavedJobs = async () => {
      try {
        // Try to load from database first
        const saved = await blink.db.savedJobs.list({
          where: { userId: user.id }
        })
        setSavedJobs(saved.map(job => job.jobId))
      } catch (error) {
        console.error('Error loading saved jobs:', error)
        // Fallback to localStorage if database is not available
        const localSaved = localStorage.getItem(`savedJobs_${user.id}`)
        if (localSaved) {
          setSavedJobs(JSON.parse(localSaved))
        }
      }
    }

    const loadInitialJobs = async () => {
      setSearchLoading(true)
      try {
        // Generate sample jobs using AI
        const { object } = await blink.ai.generateObject({
          prompt: 'Generate 8 realistic entry-level job postings for new graduates in tech, marketing, finance, and other fields. Include diverse companies and locations.',
          schema: {
            type: 'object',
            properties: {
              jobs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    company: { type: 'string' },
                    location: { type: 'string' },
                    salary: { type: 'string' },
                    type: { type: 'string' },
                    description: { type: 'string' },
                    requirements: { type: 'array', items: { type: 'string' } },
                    posted: { type: 'string' },
                    remote: { type: 'boolean' },
                    experience_level: { type: 'string' }
                  }
                }
              }
            }
          }
        })
        setJobs(object.jobs)
      } catch (error) {
        console.error('Error loading jobs:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    loadSavedJobs()
    loadInitialJobs()
  }, [user])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setSearchLoading(true)
    try {
      const { object } = await blink.ai.generateObject({
        prompt: `Find entry-level jobs for new graduates related to: "${searchQuery}". Generate 6 realistic job postings that match this search query.`,
        schema: {
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  company: { type: 'string' },
                  location: { type: 'string' },
                  salary: { type: 'string' },
                  type: { type: 'string' },
                  description: { type: 'string' },
                  requirements: { type: 'array', items: { type: 'string' } },
                  posted: { type: 'string' },
                  remote: { type: 'boolean' },
                  experience_level: { type: 'string' }
                }
              }
            }
          }
        }
      })
      setJobs(object.jobs)
    } catch (error) {
      console.error('Error searching jobs:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const toggleSaveJob = async (jobId: string) => {
    try {
      if (savedJobs.includes(jobId)) {
        // Remove from saved
        try {
          await blink.db.savedJobs.delete(jobId)
        } catch (dbError) {
          console.log('Database not available, using localStorage')
        }
        const newSavedJobs = savedJobs.filter(id => id !== jobId)
        setSavedJobs(newSavedJobs)
        localStorage.setItem(`savedJobs_${user.id}`, JSON.stringify(newSavedJobs))
      } else {
        // Add to saved
        try {
          await blink.db.savedJobs.create({
            id: `saved_${Date.now()}`,
            userId: user.id,
            jobId: jobId,
            createdAt: new Date().toISOString()
          })
        } catch (dbError) {
          console.log('Database not available, using localStorage')
        }
        const newSavedJobs = [...savedJobs, jobId]
        setSavedJobs(newSavedJobs)
        localStorage.setItem(`savedJobs_${user.id}`, JSON.stringify(newSavedJobs))
      }
    } catch (error) {
      console.error('Error toggling saved job:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <Sparkles className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">AI New Grad Job Finder</h1>
          <p className="text-muted-foreground mb-6">
            Discover your perfect entry-level job with AI-powered matching
          </p>
          <Button onClick={() => blink.auth.login()} size="lg" className="w-full">
            Sign In to Get Started
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold">AI Job Finder</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
              <Button variant="outline" onClick={() => blink.auth.logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-accent/5 to-background py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Find Your Dream Job with AI
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover entry-level opportunities tailored to your skills and preferences. 
            Let AI match you with the perfect new grad positions.
          </p>
          
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search for jobs, skills, or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              size="lg" 
              className="h-12 px-8"
              disabled={searchLoading}
            >
              {searchLoading ? 'Searching...' : 'Search Jobs'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-primary mr-2" />
                <span className="text-2xl font-bold text-primary">10K+</span>
              </div>
              <p className="text-muted-foreground">New Grad Jobs</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Building className="h-6 w-6 text-accent mr-2" />
                <span className="text-2xl font-bold text-accent">500+</span>
              </div>
              <p className="text-muted-foreground">Top Companies</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Sparkles className="h-6 w-6 text-primary mr-2" />
                <span className="text-2xl font-bold text-primary">AI</span>
              </div>
              <p className="text-muted-foreground">Powered Matching</p>
            </div>
          </div>
        </div>
      </section>

      {/* Jobs Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold">
              {searchQuery ? `Results for "${searchQuery}"` : 'Recommended Jobs'}
            </h3>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {searchLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-lg transition-shadow duration-200 group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {job.title}
                        </CardTitle>
                        <CardDescription className="font-medium text-foreground">
                          {job.company}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSaveJob(job.id)}
                        className="shrink-0"
                      >
                        <Bookmark 
                          className={`h-4 w-4 ${
                            savedJobs.includes(job.id) 
                              ? 'fill-current text-primary' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {job.location}
                      </div>
                      {job.remote && (
                        <Badge variant="secondary" className="text-xs">
                          Remote
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-accent font-medium">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {job.salary}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {job.posted}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {job.requirements.slice(0, 3).map((req, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {req}
                        </Badge>
                      ))}
                      {job.requirements.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.requirements.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button size="sm" className="flex-1">
                        Apply Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {jobs.length === 0 && !searchLoading && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No jobs found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or browse all available positions.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default App