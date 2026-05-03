export async function GET(request: Request) {
  try {
    const targetUrl = `https://rutgers.campuslabs.com/engage/api/discovery/event/search?endsAfter=${new Date().toISOString()}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=20`;
    
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('API Route Error:', error);
    return Response.json({ error: 'Failed to fetch events', value: [] }, { status: 500 });
  }
}
