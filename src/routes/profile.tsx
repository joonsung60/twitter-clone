import { styled } from "styled-components";
import { auth, db, storage } from "../firebase";
import { useEffect, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import Tweet from "../components/tweet";
import type { ITweet } from "../components/timeline";

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 20px;
`;
const AvatarUpload = styled.label`
  width: 80px;
  overflow: hidden;
  height: 80px;
  border-radius: 50%;
  background-color: #1d9bf0;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  svg {
    width: 50px;
  }
`;

const AvatarImg = styled.img`
  width: 100%;
`;
const AvatarInput = styled.input`
  display: none;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Name = styled.span`
  font-size: 22px;
`;

const NameInput = styled.input`
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background-color: transparent;
  color: white;
`;

const NameButton = styled.button`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background-color: #1d9bf0;
  color: white;
`;

const CancelButton = styled(NameButton)`
  background-color: tomato;
`;

const Tweets = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
`;

export default function Profile(){
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState(user?.photoURL);
  const [tweets, setTweets] = useState<ITweet[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  
  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!user) return;
    if (files && files.length === 1){
      const file = files[0];
      const locationRef = ref(storage, `avatars/${user?.uid}`);
      const result = await uploadBytes(locationRef, file);
      const avatarUrl = await getDownloadURL(result.ref);
      setAvatar(avatarUrl);
      await updateProfile(user, {
        photoURL: avatarUrl,
      });
    }
  };

    const onSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = nameInput.trim();
    if (trimmed === "") {
      alert("이름을 입력해주세요.");
      return;
    }
    try {
      setIsSavingName(true);
      await updateProfile(user, {
        displayName: trimmed,
      });
      // auth.currentUser 내부는 이미 업데이트됨
      setEditingName(false);
    } catch (err) {
      console.log(err);
      alert("프로필 이름 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingName(false);
    }
  };

  const fetchTweets = async () => {
    const tweetQuery = query(
      collection(db, "tweets"),
      where("userId", "==", user?.uid),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    const snapshot = await getDocs(tweetQuery);
    const tweets = snapshot.docs.map((doc) => {
      const { tweet, createdAt, userId, username, photo } = doc.data();
      return {
        tweet,
        createdAt,
        userId,
        username,
        photo,
        id: doc.id,
      };
    });
    setTweets(tweets);
  };
  useEffect(() => {
    fetchTweets();
  }, []);

   return (
    <Wrapper>
      <AvatarUpload htmlFor="avatar">
        {avatar ? <AvatarImg src={avatar} /> : <svg data-slot="icon" fill="none" stroke-width="1.5" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
        </svg>}
      </AvatarUpload>
      <AvatarInput onChange={onAvatarChange} id="avatar" type="file" accept="image/*" />
      <NameRow>
        {editingName ? (
          <form onSubmit={onSaveName}>
            <NameInput
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="이름을 입력하세요"
            />
            <NameButton type="submit" disabled={isSavingName}>
              {isSavingName ? "Saving..." : "Save"}
            </NameButton>
            <CancelButton
              type="button"
              onClick={() => {
                setEditingName(false);
                setNameInput(user?.displayName ?? "");
              }}
            >
              Cancel
            </CancelButton>
          </form>
        ) : (
          <>
            <Name>{user?.displayName ?? "Anonymous"}</Name>
            <NameButton type="button" onClick={() => setEditingName(true)}>
              Edit
            </NameButton>
          </>
        )}
      </NameRow>
      <Tweets>
        {tweets.map((tweet) => (
          <Tweet key={tweet.id} {...tweet} />
        ))}
      </Tweets>
    </Wrapper>
   );
}