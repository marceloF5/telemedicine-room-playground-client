import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import Webcam from 'react-webcam'

const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

const Video = (props) => {
    const guestHostStreamRef = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            guestHostStreamRef.current.srcObject = stream;
        })
    }, [props.peer]);

    return (
        <StyledVideo style={{height:'40%', width:'50%'}} playsInline autoPlay ref={guestHostStreamRef} />
    );
}

const Room = (props) => {
    const [hostStream, setHostStream] = useState(null)
    const [peers, setPeers] = useState([]);
    const [mute, setMute] = useState(false)
    const socketRef = useRef();
    const peersRef = useRef([]);
    const roomID = 1;

    useEffect(() => {
        if(hostStream) {
            socketRef.current = io('https://telemedicine-room-server.herokuapp.com', {
                secure: true,
                reconnection: true,
                rejectUnauthorized: false,
                reconnectionAttempts: 10
            });
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const peers = [];

                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, hostStream);

                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })

                    peers.push(peer);
                })

                setPeers(peers);
            })

            socketRef.current.on("user joined", ({ signal, callerID }) => {
                const peer = addPeer(signal, callerID, hostStream);

                peersRef.current.push({
                    peerID: callerID,
                    peer,
                })

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);

                item.peer.signal(payload.signal);
            });

            socketRef.current.on('room full', ()=>{
                props.history.push('/create-room');
            })

            socketRef.current.on('user disconnected', userDisconnected => {
                removePeer(userDisconnected)
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hostStream]);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    function removePeer(userDisconnected) {
        const users = peersRef.current.filter(peer => peer.peerID !== userDisconnected)

        setPeers(users.map(user => user.peer));
    }

    function toggleAudio() {
        hostStream.getAudioTracks().map((track) => {

            setMute(!track.enabled)

            return track.enabled = !track.enabled

        })
    }

    function toggleVideo() {
        hostStream.getVideoTracks().map((track) => track.enabled = !track.enabled)
    }

    return (
        <Container>
            <Webcam onUserMedia={(stream) => setHostStream(stream)} />
            {mute ?
                <button onClick={toggleAudio}>Mute On</button>
                :
                <button onClick={toggleAudio}>Mute Off</button>
            }            
            
            <button onClick={toggleVideo}>Video</button>
            {peers.map((peer, index) => <Video key={index} peer={peer} /> )}
        </Container>
    );
};

export default Room;
