import { LocalDB, QueryStep } from "./db"
import { CommonStatus } from "models/common_content"
import { HiveApi } from "services/HiveApi"
import { CHANNEL_REG_CONTRACT_ABI } from 'abi/ChannelRegistry';
import { ChannelRegContractAddress } from 'config';
import { setChannelAvatarSrc, setDispNameOfChannels, setSubscribers } from 'redux/slices/channel'
import { getAppPreference, LimitPostCount, getMinValueFromArray, getMergedArray, getFilteredArrayByUnique,
    sortByDate, encodeBase64, getWeb3Contract, getIpfsUrl } from "./common"

const getTableType = (type, isPublic=false) => (isPublic? `public-${type}`: type)
const getDocId = (itemId, isPublic=false) => (isPublic? `p-${itemId}`: itemId)

export const mainproc = (props) => {
    const { dispatch, setQueryStep, setPublicQueryStep } = props
    const feedsDid = sessionStorage.getItem('FEEDS_DID')
    const myDID = `did:elastos:${feedsDid}`
    const hiveApi = new HiveApi()

    // main process steps
    const updateStepFlag = (step, isPublic=false)=>(
        new Promise((resolve, reject) => {
            const flagId = `query-${isPublic? 'public-': ''}step`
            const queryStepSetter = isPublic? setPublicQueryStep: setQueryStep
            LocalDB.get(flagId)
                .then(stepDoc => {
                    if(stepDoc['step'] < step)
                        LocalDB.put({_id: flagId, step, _rev: stepDoc._rev})
                            .then(res=>{
                                queryStepSetter(step)
                                resolve(res)
                            })
                    else
                        resolve({})
                    }
                )
                .catch(err => {
                    LocalDB.put({_id: flagId, step})
                        .then(res=>{
                            queryStepSetter(step)
                            resolve(res)
                        })
                    }
                )
        })
    )

    const querySelfChannelStep = () => (
        new Promise((resolve, reject) => {
            hiveApi.querySelfChannels()
                .then(async res=>{
                    // console.log(res, '-----------self')
                    if(Array.isArray(res)){
                        const selfChannels = 
                            res.filter(item=>item.status !== CommonStatus.deleted)
                                .map(item=>{
                                    item.target_did = myDID
                                    return item
                                })
                        const selfChannelsInDB = await LocalDB.find({
                            selector: {
                                table_type: 'channel',
                                is_self: true
                            }
                        })
                        const selfChannelRevs = selfChannelsInDB.docs.reduce((revObj, doc)=>{
                            revObj[doc._id] = doc._rev
                            return revObj
                        }, {})
                        const selfChannelDoc = selfChannels.map(channel=>{
                            const channelDoc = {...channel, _id: channel.channel_id.toString(), is_self: true, is_subscribed: false, is_public: false, time_range: [], table_type: 'channel'}
                            if(selfChannelRevs[channel.channel_id])
                                channelDoc['_rev'] = selfChannelRevs[channel.channel_id]
                            return channelDoc
                        })
                        Promise.resolve()
                            .then(_=>LocalDB.bulkDocs(selfChannelDoc))
                            .then(_=>updateStepFlag(QueryStep.self_channel))
                            .then(_=>{ 
                                queryDispNameStep()
                                queryChannelAvatarStep()
                                querySubscriptionInfoStep() 
                                resolve({success: true})
                            })
                            .catch(err=>{
                                resolve({success: false, error: err})
                            })
                    }
                    else
                        resolve({success: true})
                })
                .catch(err=>{
                    reject(err)
                })
        })
    )

    const querySubscribedChannelStep = () => (
        new Promise((resolve, reject) => {
            hiveApi.queryBackupData()
                .then(async backupRes=>{
                    if(Array.isArray(backupRes)) {
                        const subscribedChannelsInDB = await LocalDB.find({
                            selector: {
                                table_type: 'channel',
                                is_subscribed: true
                            }
                        })
                        const subscribedChannelRevs = subscribedChannelsInDB.docs.reduce((revObj, doc)=>{
                            revObj[doc._id] = doc._rev
                            return revObj
                        }, {})
                        const backupChannelDocs = backupRes.map(async channel=>{
                            const channelInfoRes = await hiveApi.queryChannelInfo(channel.target_did, channel.channel_id)
                            if(channelInfoRes['find_message'] && channelInfoRes['find_message']['items'].length) {
                                const channelInfo = channelInfoRes['find_message']['items'][0]
                                const channelDoc = {...channelInfo, _id: channel.channel_id.toString(), target_did: channel.target_did, is_self: false, is_subscribed: true, is_public: false, time_range: [], table_type: 'channel'}
                                if(subscribedChannelRevs[channel.channel_id])
                                    channelDoc['_rev'] = subscribedChannelRevs[channel.channel_id]
                                return channelDoc
                            }
                        })
                        Promise.all(backupChannelDocs)
                            .then(subscribedChannels=>{
                                const selfSubcribedChannels = subscribedChannels.filter(channel=>channel.target_did === myDID)
                                const othersSubcribedChannels = subscribedChannels.filter(channel=>channel.target_did !== myDID)
                                return Promise.resolve({self: selfSubcribedChannels, others: othersSubcribedChannels})
                            })
                            .then(subscribedChannelData => {
                                const insertOtherChannelAction = LocalDB.bulkDocs(subscribedChannelData.others)
                                const updateSelfChannelAction = subscribedChannelData.self.map(channelDoc=>(
                                    new Promise((resolveSub, rejectSub)=>{
                                        LocalDB.get(channelDoc.channel_id.toString())
                                            .then(doc => resolveSub(LocalDB.put({ ...doc, is_subscribed: true })))
                                            .catch(err => resolveSub(LocalDB.put(channelDoc)))
                                    })
                                ))
                                return Promise.all([insertOtherChannelAction, ...updateSelfChannelAction])
                            })
                            .then(_=>updateStepFlag(QueryStep.subscribed_channel))
                            .then(_=>{ 
                                queryDispNameStep()
                                queryChannelAvatarStep()
                                querySubscriptionInfoStep()
                                resolve({success: true})
                            })
                            .catch(err=>{
                                resolve({success: false, error: err})
                            })
                    }
                    else
                        resolve({success: true})
                    }
                )
                .catch(err=>{
                    reject(err)
                })
        })
    )

    const queryPostStep = (isPublic=false) => (
        new Promise((resolve, reject) => {
            const prefConf = getAppPreference()
            const table_type = getTableType('channel', isPublic)
            LocalDB.find({ selector: { table_type } })
                .then(response=>{
                    const postsByChannel = response.docs.map(async channel=>{
                        try {
                            const currentime = new Date().getTime()
                            const queryApi = isPublic? hiveApi.queryPublicPostRangeOfTime: hiveApi.queryPostByRangeOfTime
                            const postRes = await queryApi(channel['target_did'], channel['channel_id'], 0, currentime)
                            if(postRes['find_message'] && postRes['find_message']['items']) {
                                let postArr = postRes['find_message']['items']
                                const timeRangeObj = {start: 0, end: currentime}
                                if(postArr.length >= LimitPostCount) {
                                    const earliestime = getMinValueFromArray(postArr, 'updated_at')
                                    timeRangeObj.start = earliestime
                                }
                                const docId = getDocId(channel._id, isPublic)
                                LocalDB.get(docId)
                                    .then(doc=>{
                                        const prevTimeRange = doc['time_range'] || []
                                        LocalDB.put({...doc, time_range: [timeRangeObj, ...prevTimeRange]})
                                    })
                                if(prefConf.DP)
                                    postArr = postArr.filter(postItem=>postItem.status!==CommonStatus.deleted)

                                const postDocArr = postArr.map(post=>{
                                    const tempost = {...post}
                                    tempost._id = getDocId(post.post_id, isPublic)
                                    tempost.target_did = channel['target_did']
                                    tempost.table_type = getTableType('post', isPublic) 
                                    tempost.likes = 0
                                    tempost.like_me = false
                                    tempost.like_creators = []
                                    tempost.mediaData = []
                                    if(typeof post.created === 'object')
                                        tempost.created = new Date(post.created['$date']).getTime()/1000
                                    return tempost
                                })
                                return postDocArr
                            }
                        } catch(err) {}
                        return []
                    })
                    Promise.all(postsByChannel)
                        .then(postGroup=> Promise.resolve(getMergedArray(postGroup)))
                        .then(postData => LocalDB.bulkDocs(postData))
                        .then(_=>updateStepFlag(QueryStep.post_data, isPublic))
                        .then(_=>{ 
                            resolve({success: true})
                        })
                        .catch(err=>{
                            resolve({success: false, error: err})
                        })
                })
                .catch(err=>{
                    reject(err)
                })
        })
    )
    
    const queryLikeInfoStep = (isPublic=false) => (
        new Promise((resolve, reject) => {
            const table_type = getTableType('post', isPublic)
            LocalDB.find({ selector: { table_type } })
                .then(response=>{
                    const postDocWithLikeInfo = response.docs.map(async post=>{
                        const postDoc = {...post}
                        try {
                            const likeRes = await hiveApi.queryLikeById(post['target_did'], post['channel_id'], post['post_id'], '0')
                            if(likeRes['find_message'] && likeRes['find_message']['items']) {
                                const likeArr = likeRes['find_message']['items']
                                const filteredLikeArr = getFilteredArrayByUnique(likeArr, 'creater_did')
                                const likeCreators = filteredLikeArr.map(item=>item.creater_did)
                                postDoc['likes'] = filteredLikeArr.length
                                postDoc['like_me'] = likeCreators.includes(myDID)
                                postDoc['like_creators'] = likeCreators
                            }
                        } catch(err) {}
                        return postDoc
                    })
                    Promise.all(postDocWithLikeInfo)
                        .then(postData => LocalDB.bulkDocs(postData))
                        .then(_=>updateStepFlag(QueryStep.post_like, isPublic))
                        .then(_=>{ 
                            resolve({success: true})
                        })
                        .catch(err=>{
                            resolve({success: false, error: err})
                        })
                })
                .catch(err=>{
                    reject(err)
                })
            })
    )

    const queryPostImgStep = (isPublic=false) => (
        new Promise((resolve, reject) => {
            const table_type = getTableType('post', isPublic)
            LocalDB.find({ selector: { table_type } })
                .then(response=>{
                    const postDocWithImg = response.docs.map(async post=>{
                        const postDoc = {...post}
                        if(post['status'] !== CommonStatus.deleted) {
                            try {
                                const contentObj = JSON.parse(post['content'])
                                const mediaData = contentObj.mediaData.filter(media=>!!media.originMediaPath).map(async media => {
                                    const mediaObj = {...media}
                                    try {
                                        const mediaSrc = await hiveApi.downloadScripting(post['target_did'], media.originMediaPath)
                                        if(mediaSrc) {
                                            mediaObj['mediaSrc'] = mediaSrc
                                        }
                                    } catch(err) {
                                        console.log(err)
                                    }
                                    return mediaObj
                                })
                                postDoc['mediaData'] = await Promise.all(mediaData)
                            } catch(err) {}
                        }
                        return postDoc
                    })
                    Promise.all(postDocWithImg)
                        .then(postData => LocalDB.bulkDocs(postData))
                        .then(_=>updateStepFlag(QueryStep.post_image, true))
                        .then(_=>{ 
                            resolve({success: true})
                        })
                        .catch(err=>{
                            resolve({success: false, error: err})
                        })
                })
                .catch(err=>{
                    reject(err)
                })
        })
    )

    const queryCommentStep = (isPublic=false) => (
        new Promise((resolve, reject) => {
            const table_type = getTableType('post', isPublic)
            LocalDB.find({ selector: { table_type } })
                .then(response=>{
                    var postGroup = response.docs.reduce((group, p) => {
                        const {target_did=null, channel_id=null, post_id=null} = {...p}
                        if(group.some(obj => obj['channel_id'] === channel_id)) {
                            const gId = group.findIndex(obj => obj['channel_id'] === channel_id)
                            group[gId]['postIds'].push(post_id)
                        }
                        else {
                            group.push({target_did, channel_id, postIds: [post_id]})
                        }
                        return group;
                    }, []);
                    const commentsByPost = postGroup.map(async group => {
                        const {target_did, channel_id, postIds} = group
                        const commentRes = await hiveApi.queryCommentsFromPosts(target_did, channel_id, postIds)
                        if(commentRes['find_message'] && commentRes['find_message']['items']) {
                            const commentArr = commentRes['find_message']['items']
                            const ascCommentArr = sortByDate(commentArr, 'asc')
                            const linkedComments = ascCommentArr.reduce((res, item)=>{
                                if(item.refcomment_id === '0' || !res.some((c) => c.comment_id === item.refcomment_id)) {
                                    const commentDoc = {
                                        ...item, 
                                        _id: getDocId(item.comment_id, isPublic), 
                                        target_did, 
                                        table_type: getTableType('comment', isPublic),
                                        likes: 0,
                                        like_me: false,
                                        like_creators: []
                                    }
                                    res.push(commentDoc)
                                    return res
                                }
                                const tempRefIndex = res.findIndex((c) => c.comment_id === item.refcomment_id)
                                if(res[tempRefIndex]['commentData'])
                                    res[tempRefIndex]['commentData'].push(item)
                                else res[tempRefIndex]['commentData'] = [item]
                                return res
                            }, []).reverse()
                            return linkedComments
                        }
                        return []
                    })
                    Promise.all(commentsByPost)
                        .then(commentGroup=>Promise.resolve(getMergedArray(commentGroup)))
                        .then(commentData =>LocalDB.bulkDocs(commentData))
                        .then(_=>updateStepFlag(QueryStep.comment_data, isPublic))
                        .then(_=>{ 
                            resolve({success: true})
                        })
                        .catch(err=>{
                            resolve({success: false, error: err})
                        })
                })
                .catch(err=>{
                    reject(err)
                })
        })
    )

    const queryCommentLikeStep = (isPublic=false) => (
        new Promise((resolve, reject) => {
            const table_type = getTableType('comment', isPublic)
            LocalDB.find({ selector: { table_type } })
                .then(response=>{
                    const commentDocWithLikeInfo = response.docs.map(async comment=>{
                        const commentDoc = {...comment}
                        const {target_did=null, channel_id=null, post_id=null, comment_id=null} = {...comment}
                        try {
                            const likeRes = await hiveApi.queryLikeById(target_did, channel_id, post_id, comment_id)
                            if(likeRes['find_message'] && likeRes['find_message']['items']) {
                                const likeArr = likeRes['find_message']['items']
                                const filteredLikeArr = getFilteredArrayByUnique(likeArr, 'creater_did')
                                const likeCreators = filteredLikeArr.map(item=>item.creater_did)
                                commentDoc['likes'] = filteredLikeArr.length
                                commentDoc['like_me'] = likeCreators.includes(myDID)
                                commentDoc['like_creators'] = likeCreators
                            }
                        } catch(err) {}
                        return commentDoc
                    })
                    Promise.all(commentDocWithLikeInfo)
                        .then(commentData =>LocalDB.bulkDocs(commentData))
                        .then(_=>updateStepFlag(QueryStep.comment_like, isPublic))
                        .then(_=>{ 
                            resolve({success: true})
                        })
                        .catch(err=>{
                            resolve({success: false, error: err})
                        })
                })
                .catch(err=>{
                    reject(err)
                })
        })
    )

    // public process steps
    const queryPublicChannelStep = () => (
        new Promise((resolve, reject) => {
            const startChannelIndex = 0, pageLimit = 0
            const channelRegContract = getWeb3Contract(CHANNEL_REG_CONTRACT_ABI, ChannelRegContractAddress, false)
            channelRegContract.methods.channelIds(startChannelIndex, pageLimit).call()
                .then(res=>{
                    if(!Array.isArray(res))
                        return
                    const publicChannelObjs = res.map(async tokenId=>{
                        const channelInfo = await channelRegContract.methods.channelInfo(tokenId).call()
                        const metaUri = getIpfsUrl(channelInfo['tokenURI'])
                        if(!channelInfo['channelEntry'] || !metaUri)
                            return null
                        const splitEntry = channelInfo['channelEntry'].split('/')
                        if(splitEntry.length<2)
                            return null

                        const targetDid = splitEntry[splitEntry.length - 2]
                        const channelId = splitEntry[splitEntry.length - 1]
                        const metaRes = await fetch(metaUri)
                        const metaContent = await metaRes.json()
                        const channelDoc = {
                            _id: getDocId(channelId, true), 
                            type: metaContent.type,
                            name: metaContent.name,
                            intro: metaContent.description,
                            channel_id: channelId,
                            target_did: targetDid, 
                            time_range: [], 
                            avatarSrc: getIpfsUrl(metaContent?.data?.avatar),
                            bannerSrc: getIpfsUrl(metaContent?.data?.banner),
                            table_type: getTableType('channel', true)
                        }
                        return channelDoc
                    })
                    Promise.all(publicChannelObjs)
                        .then(publicChannels=>{
                            const publicChannelDocs = publicChannels.filter(channel=>!!channel)
                            const putPublicChannelAction = publicChannelDocs.map(channelDoc=>(
                                new Promise((resolveSub, rejectSub)=>{
                                    const docId = getDocId(channelDoc.channel_id, true)
                                    LocalDB.get(docId)
                                        .then(doc => resolveSub(LocalDB.put({ ...channelDoc, _rev: doc._rev })))
                                        .catch(err => resolveSub(LocalDB.put(channelDoc)))
                                })
                            ))
                            return Promise.all(putPublicChannelAction)
                        })
                        .then(_=>updateStepFlag(QueryStep.public_channel, true))
                        .then(_=>{ 
                            queryDispNameStep(true)
                            querySubscriptionInfoStep(true)
                            resolve({success: true})
                        })
                        .catch(err=>{
                            resolve({success: false, error: err})
                        })
                })
        })
    )

    // async steps
    const queryDispNameStep = (isPublic=false) => {
        const table_type = getTableType('channel', isPublic)
        LocalDB.find({ selector: { table_type } })
            .then(response=>{
                const channelWithOwnerName = response.docs.filter(doc=>!!doc['owner_name'])
                const channelDocNoOwnerName = response.docs.filter(doc=>!doc['owner_name'])
                const dispNameObjs = channelWithOwnerName.reduce((objs, channel) => {
                    const c_id = channel['_id']
                    objs[c_id] = channel['owner_name']
                    return objs
                }, {})
                dispatch(setDispNameOfChannels(dispNameObjs))

                channelDocNoOwnerName.forEach(channel=>{
                    const dispNameObj = {}
                    Promise.resolve()
                        .then(_=>hiveApi.queryUserDisplayName(channel['target_did'], channel['channel_id'], channel['target_did']))
                        .then(res=>{
                            if(res['find_message'] && res['find_message']['items'].length) {
                                const dispName = res['find_message']['items'][0].display_name
                                dispNameObj[channel._id] = dispName
                                const docId = getDocId(channel._id, isPublic)
                                return LocalDB.get(docId)
                            }
                        })
                        .then(doc=>{
                            const infoDoc = {...doc, owner_name: dispNameObj[channel._id]}
                            return LocalDB.put(infoDoc)
                        })
                        .then(res=>{
                            dispatch(setDispNameOfChannels(dispNameObj))
                        })
                        .catch(err=>{})
                })
            })
    }

    const queryChannelAvatarStep = () => {
        LocalDB.find({
            selector: {
                table_type: 'channel'
            },
        })
            .then(response=>{
                const channelWithAvatar = response.docs.filter(doc=>!!doc['avatarSrc'])
                const channelDocNoAvatar = response.docs.filter(doc=>!doc['avatarSrc'])
                const avatarObjs = channelWithAvatar.reduce((objs, channel) => {
                    const c_id = channel['channel_id']
                    objs[c_id] = channel['avatarSrc']
                    return objs
                }, {})
                dispatch(setChannelAvatarSrc(avatarObjs))

                channelDocNoAvatar.forEach(channel=>{
                    if(channel['is_self']) {
                        const parseAvatar = channel['avatar'].split('@')
                        const avatarObj = {}
                        Promise.resolve()
                            .then(_=>hiveApi.downloadCustomeAvatar(parseAvatar[parseAvatar.length-1]))
                            .then(avatarRes=>{
                                if(avatarRes && avatarRes.length) {
                                    const avatarSrc = avatarRes.reduce((content, code)=>{
                                        content=`${content}${String.fromCharCode(code)}`;
                                        return content
                                    }, '')
                                    avatarObj[channel._id] = encodeBase64(avatarSrc)
                                    return LocalDB.get(channel._id)
                                }
                            })
                            .then(doc=>{
                                const infoDoc = {...doc, avatarSrc: avatarObj[channel._id]}
                                LocalDB.put(infoDoc)
                                dispatch(setChannelAvatarSrc(avatarObj))
                            })
                    }
                    else {
                        const avatarObj = {}
                        Promise.resolve()
                            .then(_=>hiveApi.downloadScripting(channel['target_did'], channel['avatar']))
                            .then(avatarRes=>{
                                avatarObj[channel._id] = encodeBase64(avatarRes)
                                return LocalDB.get(channel._id)
                            })
                            .then(doc=>{
                                const infoDoc = {...doc, avatarSrc: avatarObj[channel._id]}
                                LocalDB.put(infoDoc)
                                dispatch(setChannelAvatarSrc(avatarObj))
                            })
                    }
                })
            })
            .catch(err=>{})
    }

    const querySubscriptionInfoStep = (isPublic=false) => {
        const table_type = getTableType('channel', isPublic)
        LocalDB.find({ selector: { table_type } })
            .then(response=>{
                const channelWithSubscribers = response.docs.filter(doc=>!!doc['subscribers'])
                const channelDocNoSubscribers = response.docs.filter(doc=>!doc['subscribers'])
                const subscribersObj = channelWithSubscribers.reduce((obj, channel) => {
                    const c_id = channel['_id']
                    obj[c_id] = channel['subscribers']
                    return obj
                }, {})
                dispatch(setSubscribers(subscribersObj))

                channelDocNoSubscribers.forEach(channel=>{
                    const subscribersObj = {}
                    Promise.resolve()
                        .then(_=>hiveApi.querySubscriptionInfoByChannelId(channel['target_did'], channel['channel_id']))
                        .then(res=>{
                            if(res['find_message']) {
                                const subscribersArr = res['find_message']['items']
                                subscribersObj[channel._id] = subscribersArr
                                const docId = getDocId(channel._id, isPublic)
                                return LocalDB.get(docId)
                            }
                        })
                        .then(doc=>{
                            const infoDoc = {...doc, subscribers: subscribersObj[channel._id]}
                            LocalDB.put(infoDoc)
                            dispatch(setSubscribers(subscribersObj))
                        })
                        .catch(err=>{})
                })
            })
    }

    const querySteps = [
        querySelfChannelStep, 
        querySubscribedChannelStep, 
        queryPostStep,
        queryLikeInfoStep,
        queryPostImgStep,
        queryCommentStep,
        queryCommentLikeStep
    ]
    const asyncSteps = {
        queryDispNameStep, 
        queryChannelAvatarStep, 
        querySubscriptionInfoStep
    }
    return { querySteps, asyncSteps }
}