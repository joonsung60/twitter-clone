import { styled } from "styled-components";
import { ITweet } from "./timeline";
import { auth, db, storage } from "../firebase";
import { deleteDoc, doc, updateDoc, deleteField } from "firebase/firestore";
import { deleteObject, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState, useRef } from "react";

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
`;

const Column = styled.div``;

const Photo = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 15px;
  object-fit: cover;
`;

const Username = styled.span`
  font-weight: 600;
  font-size: 15px;
`;

const Payload = styled.p`
  margin: 10px 0px;
  font-size: 18px;
`;

const DeleteButton = styled.button`
background-color: red;
color: white;
font-weight: 600;
border: 0;
font-size: 12px;
padding: 5px 10px;
text-transform: uppercase;
border-radius: 5px;
cursor: pointer;
`;

const EditButton = styled.button`
  background-color: #1d9bf0;
  color: white;
  font-weight: 600;
  border: 0;
  font-size: 12px;
  padding: 5px 10px;
  text-transform: uppercase;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 8px;
`;

const SmallButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ddd;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 4px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 60px;
  margin: 10px 0;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background-color: black;
  color: white;
  resize: none;
`;

const FileInput = styled.input`
  margin-top: 4px;
  font-size: 11px;
`;

export default function Tweet({ username, photo, tweet, userId, id }: ITweet) {
  const user = auth.currentUser;
  const isOwner = user?.uid === userId;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editing, setEditing] = useState(false);
  const [editedTweet, setEditedTweet] = useState(tweet);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(photo ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const onDelete = async() => {
    const ok = confirm("트윗을 삭제하시겠습니까?");
    if(!ok || user?.uid !== userId) return;
    try {
      await deleteDoc(doc(db, "tweets", id));
      if(photo) {
        const photoRef = ref(storage, `tweets/${user.uid}/${id}`);
        await deleteObject(photoRef);
      }
    } catch(e){
      console.log(e);
    } finally {
      //
    }
  };

    const onEditClick = () => {
    if (!isOwner) return;
    setEditing(true);
    setEditedTweet(tweet); // 혹시 최신 값으로 초기화
    setNewFile(null);
  };

  const onCancelEdit = () => {
    setEditing(false);
    setEditedTweet(tweet);
    setNewFile(null);
    setRemovePhoto(false);
    setPreviewPhoto(photo ?? null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];

    if (selectedFile.size > 1 * 1024 * 1024) {
      alert("이미지는 1MB 이하만 업로드 가능합니다.");
      return;
    }

    // 로컬 미리보기용 URL 생성
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewPhoto(objectUrl);   // 화면에서는 바로 새 사진으로 보이게
    setNewFile(selectedFile);     // 나중에 저장할 때 업로드할 실제 파일
    setRemovePhoto(false);        // “삭제 예정” 상태 해제
  };

  const onRemovePhoto = () => {
    if (!isOwner) return;
    const ok = confirm("사진을 삭제하시겠습니까?");
    if (!ok) return;

    setPreviewPhoto(null);  // 화면에서 즉시 사라지게
    setNewFile(null);       // 새 파일도 취소
    setRemovePhoto(true);   // 저장 시 진짜 삭제하겠다는 플래그

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
  }
  };

  const onSave = async () => {
    if (!isOwner || isSaving) return;
    if (editedTweet.trim() === "") {
      alert("트윗 내용을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const docRef = doc(db, "tweets", id);
      const updates: any = { tweet: editedTweet };

      if (newFile) {
        // 새 파일 업로드 → URL 받아서 photo 갱신
        const fileRef = ref(storage, `tweets/${userId}/${id}`);
        const result = await uploadBytes(fileRef, newFile);
        const url = await getDownloadURL(result.ref);
        updates.photo = url;
      } else if (removePhoto) {
        // 사진 삭제만 한 경우
        updates.photo = deleteField();
        // + 선택적으로 Storage에서도 삭제 가능 (지금처럼)
        // const imgRef = ref(storage, `tweets/${userId}/${id}`);
        // await deleteObject(imgRef).catch(() => {});
      }

      await updateDoc(docRef, updates);

      setEditing(false);
      setNewFile(null);
      setRemovePhoto(false);
    } catch (e) {
      console.log(e);
      alert("트윗 수정 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
  <Wrapper>
    <Column>
      <Username>{username}</Username>

      {editing ? (
        <>
          <TextArea
            value={editedTweet}
            onChange={(e) => setEditedTweet(e.target.value)}
            maxLength={180}
          />
          {/* 사진 미리보기 */}
          {previewPhoto && (
            <div style={{ marginTop: 8 }}>
              <Photo src={previewPhoto} />
            </div>
          )}

          {/* 사진 선택 / 삭제 버튼 */}
          {isOwner && (
            <>
              <FileInput
                ref={fileInputRef}  
                type="file"
                accept="image/*"
                onChange={onFileChange}
              />
              {previewPhoto && (
                <SmallButton type="button" onClick={onRemovePhoto}>
                  사진 삭제
                </SmallButton>
              )}
            </>
          )}

          <div style={{ marginTop: 8 }}>
            <EditButton type="button" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "SAVE"}
            </EditButton>
            <DeleteButton type="button" onClick={onCancelEdit}>
              CANCEL
            </DeleteButton>
          </div>
        </>
      ) : (
        <>
          <Payload>{tweet}</Payload>
          {isOwner && (
            <div style={{ marginTop: 8 }}>
              <EditButton type="button" onClick={onEditClick}>
                Edit
              </EditButton>
              <DeleteButton type="button" onClick={onDelete}>
                Delete
              </DeleteButton>
            </div>
          )}
        </>
      )}
    </Column>

    {/* 보기 모드일 때 오른쪽에 사진 */}
    {!editing && photo ? (
      <Column>
        <Photo src={photo} />
      </Column>
    ) : null}
  </Wrapper>
);
}