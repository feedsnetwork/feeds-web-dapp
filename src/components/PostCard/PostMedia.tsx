import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { LazyLoadImage } from "react-lazy-load-image-component";
import { Box } from '@mui/material';

import { selectLoadedPostMedia, setActiveImagePath, setOpenImageScreen } from 'redux/slices/post';
import { getLocalDB } from 'utils/db';
import { decodeBase64 } from 'utils/common';

const PostMedia = (props) => {
  const { postId, direction } = props
  const loadedPostMedia = useSelector(selectLoadedPostMedia(postId))
  const [thumbnailSrc, setThumbnailSrc] = React.useState('')
  const LocalDB = getLocalDB()
  const dispatch = useDispatch()

  React.useEffect(()=>{
    setThumbnailSrc('')
    if(loadedPostMedia) {
      LocalDB.find({
        selector: {_id: loadedPostMedia},
        fields: ['thumbnail']
      })
        .then(res=>{
          if(res.docs.length) {
            setThumbnailSrc(decodeBase64(res.docs[0]['thumbnail']))
          }
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedPostMedia])

  const handleOpenScreen = (e)=>{
    e.stopPropagation()
    dispatch(setActiveImagePath(loadedPostMedia))
    dispatch(setOpenImageScreen(true))
  }
  const ImgBoxSx = direction === 'row'? {pl: 2}: {pt: 2}
  return (
    !thumbnailSrc?
    <div />:
    <Box {...ImgBoxSx}>
      <LazyLoadImage
        src={thumbnailSrc}
        effect="blur" 
        wrapperProps={{
          style:{
            display: 'contents'
          }
        }} 
        style={{
          margin: 'auto',
          width: direction==='row'? 180: '100%',
          borderRadius: direction==='row'? 1: 0,
          // height: width,
          transition: 'border-radius .2s',
        }} 
        onClick={handleOpenScreen}
      />
    </Box>
  )
}

export default React.memo(PostMedia);