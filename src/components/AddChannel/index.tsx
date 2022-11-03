import { FC, useState, useRef, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import { Icon } from '@iconify/react';
import { Box, Typography, Stack, Card, Input, IconButton, Grid, styled, FormControl, FormHelperText } from '@mui/material';

import StyledButton from 'components/StyledButton';
import { handleSuccessModal, setChannelAvatarSrc, setCreatedChannel, setDispNameOfChannels } from 'redux/slices/channel';
import { selectMyInfo } from 'redux/slices/user';
import { HiveApi } from 'services/HiveApi'
import { encodeBase64, getBufferFromFile } from 'utils/common'
import { LocalDB } from 'utils/db';
import { SidebarContext } from 'contexts/SidebarContext';

const AvatarWrapper = styled(Box)(
  ({ theme }) => `
    position: relative;
    overflow: visible;
    display: inline-block;
`
);

const ButtonUploadWrapper = styled(Box)(
  ({ theme }) => `
    position: absolute;
    width: ${theme.spacing(4)};
    height: ${theme.spacing(4)};
    bottom: -${theme.spacing(0)};
    right: -${theme.spacing(0)};

    .MuiIconButton-root {
      border-radius: 100%;
      background: ${theme.colors.primary.main};
      color: ${theme.palette.primary.contrastText};
      width: ${theme.spacing(4)};
      height: ${theme.spacing(4)};
      padding: 0;
  
      &:hover {
        background: ${theme.colors.primary.dark};
      }
    }
`
);

const AvatarInput = styled('input')({
  display: 'none'
});

interface AddChannelProps {
  // type?: string;
}
const AddChannel: FC<AddChannelProps> = (props)=>{
  const { updateChannelNumber, setUpdateChannelNumber } = useContext(SidebarContext)
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tipping, setTipping] = useState('');
  const [isOnValidation, setOnValidation] = useState(false);
  const [onProgress, setOnProgress] = useState(false);
  const nameRef = useRef(null)
  const descriptionRef = useRef(null)
  const tippingRef = useRef(null)
  const feedsDid = sessionStorage.getItem('FEEDS_DID')
  const myDID = `did:elastos:${feedsDid}`
  const hiveApi = new HiveApi()
  const dispatch = useDispatch();
  const myInfo = useSelector(selectMyInfo)
  const { enqueueSnackbar } = useSnackbar();
  
  const handleFileChange = event => {
    const fileObj = event.target.files && event.target.files[0];
    if (fileObj) {
      const tempFileObj = Object.assign(fileObj, {preview: URL.createObjectURL(fileObj)})
      setAvatarUrl(tempFileObj);
    }
  };

  const saveAction = async (e) => {
    setOnValidation(true)
    if(!avatarUrl)
      return
    if(!name) {
      nameRef.current.focus()
      return
    }
    if(!description) {
      descriptionRef.current.focus()
      return
    }
    if(!tipping) {
      tippingRef.current.focus()
      return
    }

    setOnProgress(true)
    const imageBuffer = await getBufferFromFile(avatarUrl) as Buffer
    const base64content = imageBuffer.toString('base64')
    const avatarContent = `data:${avatarUrl.type};base64,${base64content}`
    const imageHivePath = await hiveApi.uploadMediaDataWithString(avatarContent)
    const createdChannel = {
      name: name,
      intro: description,
      avatarPath: imageHivePath,
      avatarPreview: avatarUrl['preview'],
      avatarContent: base64content,
      tippingAddr: tippingRef.current.value
    }
    hiveApi.createChannel(createdChannel.name, createdChannel.intro, createdChannel.avatarPath, createdChannel.tippingAddr)
      .then(result=>{
        // enqueueSnackbar('Add channel success', { variant: 'success' });
        setOnProgress(false)
        handleSuccessModal(true)(dispatch)
        dispatch(setCreatedChannel(createdChannel))
        hiveApi.queryChannelInfo(myDID, result.channelId)
          .then(res=>{
            if(res['find_message'] && res['find_message']['items'].length) {
              const channelInfo = res['find_message']['items'][0]
              const newChannelDoc = {
                ...channelInfo,
                target_did: myDID,
                _id: channelInfo['channel_id'], 
                is_self: true, 
                is_subscribed: false, 
                time_range: [], 
                table_type: 'channel',
                avatarSrc: encodeBase64(avatarContent),
                owner_name: myInfo['name'] || "",
                subscribers: [],
              }
              return LocalDB.put(newChannelDoc)
            }
          })
          .then(res=>{
            const avatarObj = {}
            avatarObj[result.channelId] = encodeBase64(avatarContent)
            dispatch(setChannelAvatarSrc(avatarObj))
            const dispNameObj = {}
            dispNameObj[result.channelId] = myInfo['name']
            dispatch(setDispNameOfChannels(dispNameObj))
            setUpdateChannelNumber(updateChannelNumber+1)
            window.history.back()
          })
      })
      
      .catch(error=>{
        enqueueSnackbar('Add channel error', { variant: 'error' });
        setOnProgress(false)
      })
  }

  return (
    <Box p={4}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={6} alignItems='center'>
          <AvatarWrapper>
            <Box component='img' src={avatarUrl?avatarUrl.preview:'/user-circle.svg'} draggable={false} sx={{ width: 90, height: 90, borderRadius: '50%'}}/>
            <ButtonUploadWrapper>
              <AvatarInput
                accept="image/*"
                id="icon-button-file"
                name="icon-button-file"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="icon-button-file">
                <IconButton component="span" color="primary">
                  <Icon icon="akar-icons:edit" />
                </IconButton>
              </label>
            </ButtonUploadWrapper>
          </AvatarWrapper>
          {
            isOnValidation && !avatarUrl &&
            <FormControl error={true} variant="standard" sx={{width: '100%', mt: '0px !important', alignItems: 'center'}}>
              <FormHelperText id="avatar-error-text">Avatar file is required</FormHelperText>
            </FormControl>
          }
          <Grid container direction="column">
            <Grid item>
              <Typography variant='subtitle1'>Name</Typography>
              <FormControl error={isOnValidation&&!name.length} variant="standard" sx={{width: '100%'}}>
                <Input 
                  placeholder="Add channel name" 
                  fullWidth 
                  inputRef={nameRef}
                  value={name}
                  onChange={(e)=>{setName(e.target.value)}}
                />
                <FormHelperText id="name-error-text" hidden={!isOnValidation||(isOnValidation&&name.length>0)}>Name is required</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item py={2}>
              <Typography variant='subtitle1'>Description</Typography>
              <FormControl error={isOnValidation&&!description.length} variant="standard" sx={{width: '100%'}}>
                <Input 
                  placeholder="Add channel description" 
                  fullWidth 
                  inputRef={descriptionRef}
                  value={description}
                  onChange={(e)=>{setDescription(e.target.value)}}
                />
                <FormHelperText id="description-error-text" hidden={!isOnValidation||(isOnValidation&&description.length>0)}>Description is required</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item>
              <Typography variant='subtitle1'>Tipping Address</Typography>
              <FormControl error={isOnValidation&&!tipping.length} variant="standard" sx={{width: '100%'}}>
                <Input 
                  placeholder="Enter tipping address" 
                  fullWidth 
                  inputRef={tippingRef}
                  value={tipping}
                  onChange={(e)=>{setTipping(e.target.value)}}
                />
                <FormHelperText id="description-error-text" hidden={!isOnValidation||(isOnValidation&&tipping.length>0)}>Tipping Address is required</FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
          <Box width={200}>
            <StyledButton fullWidth loading={onProgress} needLoading={true} onClick={saveAction}>Create</StyledButton>
          </Box>
        </Stack>
      </Card>
    </Box>
  );
}

AddChannel.propTypes = {
  // type: PropTypes.oneOf([
  //   'home',
  //   'channel',
  //   'subscription',
  // ])
};

export default AddChannel;
