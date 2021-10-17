import { LogQueue } from "../utils/log";
import { Logger } from "@candlelib/log";

const common_extension =
{
	"none": 0,
	"html": 0,
	"xhtml": 0,
	"xml": 0,
	"svg": 0,
	"css": 0,
	"sass": 0,
	"json": 0,
	"js": 0,
	"png": 0,
	"jpg": 0,
	"tif": 0,
	"gif": 0,
	"php": 0
};

type ext_map = { [i in keyof typeof common_extension]: number; };

const extension_array = Object.entries(common_extension);

const ext_map: ext_map = <any>extension_array.reduce((a, [e], i) => (a[e] = 1 << (i), a), {});

//@ts-ignore
ext_map.any = 0x80000000;

//@ts-ignore
ext_map.all = 0xFFFFFFFF;

let key_offset = extension_array.length;

export function addKey(key, ext_map, log: LogQueue = null) {

	if (!ext_map[key] && key_offset < 31) {
		ext_map[key] = 1 << key_offset++;
		if (log)
			log.createLocalLog("Extension").debug(`Added new extension [*.${key}] with value ${ext_map[key]}`).delete();
		else
			Logger.get("lantern").debug(`Extension: Added new extension [*.${key}] with value ${ext_map[key]}`);
	}

	return ext_map[key] || 0xFFFFFFFF;
}

export default <ext_map & any>ext_map;
