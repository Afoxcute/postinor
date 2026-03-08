const uploadFilePinata = async (fileToUpload: File): Promise<any> => {
    try {
      // Check if Pinata JWT token is configured
      const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;
      if (!pinataJwt) {
        const errorMsg = "Pinata JWT token is not configured. Please add NEXT_PUBLIC_PINATA_JWT to your .env.local file. See: https://app.pinata.cloud/developers/api-keys";
        console.error(errorMsg);
        alert(errorMsg);
        return null;
      }

      // Convert file to FormData
      const formData = new FormData();
      formData.append("file", fileToUpload, fileToUpload.name);
  
      // Upload the file to Pinata
      const uploadUrl = "https://api.pinata.cloud/pinning/pinFileToIPFS";
      const uploadOptions: RequestInit = {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: formData,
      };
  
      const uploadResponse = await fetch(uploadUrl, uploadOptions);
  
      if (!uploadResponse.ok) {
        if (uploadResponse.status === 401) {
          const errorMsg = "Pinata authentication failed. Please check your NEXT_PUBLIC_PINATA_JWT token in .env.local and restart your dev server.";
          console.error(errorMsg);
          alert(errorMsg);
          return null;
        }
        throw new Error(`Error uploading file: ${uploadResponse.statusText}`);
      }
  
      const uploadData = await uploadResponse.json();
      console.log("File uploaded to IPFS:", uploadData);
      return uploadData;
  
    } catch (error) {
      console.error("Error uploading file to Pinata:", error);
      alert("Trouble uploading file. Check console for details.");
      return null;
    }
  };
  
  export default uploadFilePinata;
  