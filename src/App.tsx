import { useState, ChangeEvent, useEffect } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data'
import { uploadData } from 'aws-amplify/storage';
import { v4 as uuidv4 } from 'uuid';

import { type Schema } from 'amplify/data/resource';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Checkbox } from './components/ui/checkbox';
import { ImageMetadata } from './lib/types';

const filters: Record<string, string> = {
  'blur': 'Blur',
  'blackWhite': 'Black and white',
  'pixelate': 'Pixelate',
  'rotate': 'Rotate 90 degrees',
  'mirror': 'Mirror image',
}

const App = () => {
  const { signOut } = useAuthenticator();
  const dataClient = generateClient<Schema>();

  const [file, setFile] = useState<File | null>(null);
  const [uploadInProgress, setUploadInProgress] = useState<boolean>(false);

  const [originalImageKey, setOriginalImageKey] = useState<string | null>(null);
  const [processedImageKey, setProcessedImageKey] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [uploadHistory, setUploadHistory] = useState<ImageMetadata[]>([]);

  useEffect(() => {
    fetchHistory();
  });

  const applyFilter = async (imageKey: string) => {
    const response = await dataClient.queries.ImageProcessor({
      originalImageS3Key: imageKey,
      filters: selectedFilters,
    })
    if (response.errors || !response.data?.success) {
      throw new Error(response.errors?.toString());
    } else {
      return response.data.processedImageS3Key!;
    }
  };

  const getUploadHistory = async (): Promise<ImageMetadata[]> => {
    const userId = (await getCurrentUser()).userId;
    const { data: imageMetadata, errors: _ } = await dataClient.models.ImageMetadata.list({
      filter: {
        userId: {
          eq: userId,
        }
      }
    });
    return imageMetadata;
  };

  const fetchHistory = async () => {
    const history = await getUploadHistory();
    setUploadHistory(history);
  };

  const handleFileSelectFromHistory = async (imageMetadata: ImageMetadata) => {
    setOriginalImageKey(imageMetadata.originalImageS3Key);
    setProcessedImageKey(imageMetadata.processedImageS3Key || null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const userId = (await getCurrentUser()).userId;
    const imageKey = `images/${uuidv4()}`;
    try {
      await uploadData({
        path: imageKey,
        data: file,
        options: {
          contentType: file.type,
        }
      }).result;
      await dataClient.models.ImageMetadata.create({
        userId: userId,
        fileName: file.name,
        originalImageS3Key: imageKey,
      });
    } catch (error) {
      return "";
    }
    return imageKey;
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }
    setUploadInProgress(true);
    const imageKey = await uploadImage(file);
    setUploadInProgress(false);
    setOriginalImageKey(imageKey);
  };

  const handleApplyFilters = async () => {
    if (!selectedFilters.length || !originalImageKey) {
      return;
    }
    let returnedImageKey;
    try {
      returnedImageKey = await applyFilter(originalImageKey);
    } catch (error) {
      console.error(error);
      return;
    }
    setProcessedImageKey(returnedImageKey);
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
          <CardContent className="flex space-x-2">
            <Input type="file" onChange={handleFileChange} className="flex-grow" />
            <Button onClick={handleUpload} disabled={!file || uploadInProgress}>Upload</Button>
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
                {uploadHistory.map((item) => (
                  <li
                    key={item.originalImageS3Key}
                    className="cursor-pointer hover:bg-gray-200 p-2 rounded"
                    onClick={() => handleFileSelectFromHistory(item)}
                  >
                    {item.fileName}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>
      {originalImageKey && (
        <main className="w-3/4 flex justify-center items-center p-4">
          <div className="h-[75vh] w-[75%]">
            <Card className="h-full overflow-hidden flex">
              <div className="w-1/4 p-4 overflow-y-auto">
                <CardHeader>
                  <CardTitle>Raw Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    {Object.keys(filters).map((filterValue) => (
                      <div key={filterValue} className="flex items-center mb-2">
                        <Checkbox
                          checked={selectedFilters.includes(filterValue)}
                          onCheckedChange={handleFilterCheckboxChange(filterValue)}
                          id={filterValue}
                        />
                        <label htmlFor={filterValue} className="ml-2">{filters[filterValue]}</label>
                      </div>
                    ))}
                    <Button onClick={handleApplyFilters} className="mt-2">Apply Filters</Button>
                  </div>
                  <div>
                    <Separator className="mb-2" />
                    <Label>Image Preview:</Label>
                    <StorageImage
                      path={originalImageKey}
                      alt="cat"
                      className="w-full object-contain max-h-[calc(75vh-300px)]"
                    />
                  </div>
                </CardContent>
              </div>
              <div className="p-4 overflow-y-auto">
                <CardHeader>
                  <CardTitle>Processed Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {processedImageKey && (
                    <div>
                      <img
                        src={processedImageKey}
                        alt="Processed"
                        className="w-full object-contain max-h-[calc(75vh-350px)]"
                      />
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          </div>
        </main>
      )}
    </div>
  );
};

export default App;
