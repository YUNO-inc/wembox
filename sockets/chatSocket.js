const Chat = require('../models/chat/chatModel');
const chatConfig = require('../config/chatConfig');
const { chatStatusEnum, deliveredStatus, seenStatus } = chatConfig; // Making `this` available
const {
  getNumSocketClients,
  createChatRoomStr,
} = require('../utilities/helpers');
const Contact = require('../models/contact/contactsModel');

exports.chatSent = async (
  socket,
  chatData = { newChat: {}, updatedContact: {} },
  io
) => {
  const userId = socket?.user?.id;
  const receiver = chatData?.newChat?.receiver;
  const sender = chatData?.newChat?.sender;
  const contactId = chatData?.updatedContact?._id;
  const newChatId = chatData?.newChat?._id;
  let receiverInChatRoom = false;

  if (!userId || !receiver || !sender || !contactId || !newChatId) return;
  chatData.updatedContact.unseenMessages =
    chatData?.updatedContact.unseens[receiver];
  socket.to(receiver).emit('chatReceived', {
    ...chatData,
    updatedContact: {
      ...chatData.updatedContact,
      lastMessage: chatData.newChat,
    },
  });

  if (!getNumSocketClients(io, receiver)) return; // Is basically not online.
  if (getNumSocketClients(io, createChatRoomStr(contactId, receiver))) {
    receiverInChatRoom = true;
    chatData.updatedContact.unseens[receiver] = 0;
    chatData.updatedContact.unseenMessages =
      chatData.updatedContact.unseens[receiver];
  } // Means receiver is in chat room.

  const newChatStatus = receiverInChatRoom ? seenStatus : deliveredStatus;
  chatData.newChat.status = newChatStatus;
  socket.emit('chatProcessed', chatData);

  await Chat.updateOne(
    { _id: newChatId },
    { status: receiverInChatRoom ? seenStatus : deliveredStatus }
  );
  receiverInChatRoom &&
    (await Contact.updateOne(
      { _id: contactId },
      { [`unseens.${receiver}`]: 0 }
    ));
};

exports.updateChatStatus = async (
  socket,
  queryObj = {
    newStatus: '',
    contactData: [{ otherUser, contactId }],
  }
) => {
  const { newStatus, contactData } = queryObj;
  const userId = socket.user.id;

  if (!chatStatusEnum.includes(newStatus) || !userId || !contactData?.length)
    return;

  const possiblePrevStatus = chatConfig.getPossiblePrevStatus('seen');
  contactData.forEach((contact) => {
    if (!contact.otherUser || !contact.contactId) return;
    socket.to(contact.otherUser).emit('chatStatusUpdated', {
      newStatus,
      possiblePrevStatus,
      contactId: contact.contactId,
    });
  });
};
