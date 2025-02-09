import { useState, ChangeEvent, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from './components/ui/scroll-area';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Separator } from './components/ui/separator';
import { Checkbox } from './components/ui/checkbox';

// Placeholder for Amplify interactions
const uploadImage = async (file: File) => {
  // Replace with actual Amplify upload logic
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("https://via.placeholder.com/300"); // Placeholder URL
    }, 1000);
  });
};

const applyFilter = async (imageUrl: string, filter: string) => {
  // Replace with actual filter application and upload logic
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`https://via.placeholder.com/300?text=${filter}`); // Placeholder URL
    }, 1000);
  });
};

const getUploadHistory = async () => {
  // Replace with actual DynamoDB query logic to fetch history
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: "1", filename: "image1.jpg", rawUrl: "https://via.placeholder.com/150", processedUrl: "https://via.placeholder.com/150?text=sepia" },
        { id: "2", filename: "image2.png", rawUrl: "https://via.placeholder.com/150", processedUrl: null },
      ]);
    }, 500);
  });
};

const getFileDetails = async (id: string) => {
  // Replace with actual DynamoDB query logic to fetch file details by ID
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockHistory = [
        { id: "1", filename: "image1.jpg", rawUrl: "https://via.placeholder.com/300", processedUrl: "https://via.placeholder.com/300?text=sepia" },
        { id: "2", filename: "image2.png", rawUrl: "https://via.placeholder.com/300", processedUrl: null },
      ];
      const file = mockHistory.find(f => f.id === id);
      resolve(file);
    }, 500);
  });
};

const filters = [
  "grayscale",
  "sepia",
  "blur",
  "invert"
]


const App = () => {
  const { signOut } = useAuthenticator();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [filteredImageUrl, setFilteredImageUrl] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [selectedFileDetails, setSelectedFileDetails] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await getUploadHistory();
      setUploadHistory(history as any);
    };
    fetchHistory();
  }, []);

  const handleFileSelectFromHistory = async (id: string) => {
    const fileDetails = await getFileDetails(id);
    setSelectedFileDetails(fileDetails);
    setUploadedImageUrl(fileDetails?.rawUrl || null);
    setFilteredImageUrl(fileDetails?.processedUrl || null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      const url = await uploadImage(selectedFile);
      setUploadedImageUrl(url as string);
    }
  };

  const handleApplyFilters = async () => {
    if (uploadedImageUrl && selectedFilters.length > 0) {
      let currentImageUrl = uploadedImageUrl;
      for (const filter of selectedFilters) {
        currentImageUrl = await applyFilter(currentImageUrl, filter) as string; // Apply filters sequentially
      }
      setFilteredImageUrl(currentImageUrl);
    }
  };

  const handleFilterCheckboxChange = (filter: string) => (checked: boolean) => {
    if (checked) {
      setSelectedFilters([...selectedFilters, filter]); // Add filter
    } else {
      setSelectedFilters(selectedFilters.filter((f) => f !== filter)); // Remove filter
    }
  };

  return (
    <div className="flex bg-gray-600 h-screen w-screen overflow-hidden">
      <aside className="w-1/4 bg-gray-100 p-4 overflow-y-auto">
        <Button className="mb-2" onClick={signOut}>Logout</Button>
        <Separator />
        <Card>
          <CardHeader>
            <CardTitle>Upload raw file:</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-2"> {/* Use flex and space-x-2 */}
            <Input type="file" onChange={handleFileChange} className="flex-grow" /> {/* flex-grow */}
            <Button onClick={handleUpload} disabled={!selectedFile}>Upload</Button>
          </CardContent>
        </Card>
        <Separator />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Upload History</CardTitle>
          </CardHeader>
          <Separator className="mb-2" />
          <CardContent>
            <ScrollArea className="h-full overflow-hidden">
              <ul className="space-y-2">
                {uploadHistory.map((item: any) => (
                  <li key={item.id} className="cursor-pointer hover:bg-gray-200 p-2 rounded" onClick={() => handleFileSelectFromHistory(item.id)}>
                    {item.filename}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>
      <main className="w-3/4 flex justify-center items-center p-4">
        <div className="h-[75vh] w-[75%]">
          <Card className="h-full overflow-hidden flex">
            <div className="w-1/4 p-4 overflow-y-auto">
              <CardHeader>
                <CardTitle>Raw Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {filters.map((filter) => (
                    <div key={filter} className="flex items-center mb-2">
                      <Checkbox
                        checked={selectedFilters.includes(filter)}
                        onCheckedChange={handleFilterCheckboxChange(filter)}
                        id={filter}
                      />
                      <label htmlFor={filter} className="ml-2">{filter}</label>
                    </div>
                  ))}
                  <Button onClick={handleApplyFilters} className="mt-2">Apply Filters</Button>
                </div>
                {uploadedImageUrl && (
                  <div>
                    <Separator className="mb-2" />
                    <Label>Image Preview:</Label>
                    <img src={uploadedImageUrl} alt="Raw" className="w-full object-contain max-h-[calc(75vh-300px)]" />
                  </div>
                )}
              </CardContent>
            </div>
            <div className="p-4 overflow-y-auto">
              <CardHeader>
                <CardTitle>Processed Image</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredImageUrl && (
                  <div>
                    <img src={filteredImageUrl} alt="Processed" className="w-full object-contain max-h-[calc(75vh-350px)]" /> {/* Adjust max-h */}
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default App;
